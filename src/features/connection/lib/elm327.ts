import RNBluetoothClassic, {
  type BluetoothDevice,
  type BluetoothEventSubscription,
} from 'react-native-bluetooth-classic';

import { markerOffset, parseResponse, responseModeFor, type ObdResponse } from '@/lib/obd/protocol';
import { PROTOCOL_NAMES, protocolIdFromReply } from '@/lib/obd/protocols';
import { acceptsReply, linkReplyHealth } from '@/lib/obd/reply-match';
import { SUPPORT_BLOCK_PIDS, chainsToNextBlock, decodeSupportMask } from '@/lib/obd/supported';
import { extractPayload } from '@/lib/obd/protocol';

import { humanizeBluetoothError } from './bluetooth-errors';
import {
  ADAPTER_INIT_SEQUENCE,
  COMMAND_TERMINATOR,
  ECU_HANDSHAKE,
  ELM327_CONNECTION_OPTIONS,
  ELM327_INSECURE_OPTIONS,
  PROTOCOL_QUERY,
  PROTOCOL_RESET,
  PROTOCOL_SELECT_TIMEOUT_MS,
  SILENT_PROBES_BEFORE_GIVING_UP,
  type InitStep,
} from './at-commands';
import { buildHandshakePlan } from './handshake-plan';

const LOG_PREFIX = '[ELM327]';

/**
 * Pause before writing again after a timeout. The protocol has no request ids,
 * so a reply is matched to a command purely by arrival order; a late reply that
 * lands after the next write would satisfy the wrong command. Waiting lets it
 * arrive while nothing is pending, where the reader discards it.
 */
const RESYNC_DELAY_MS = 300;

/**
 * Consecutive failed commands before the link is treated as broken rather
 * than merely slow. Several in a row means the vehicle session was lost —
 * usually after a brownout that also erased the adapter's configuration.
 */
const TROUBLE_THRESHOLD = 4;

/**
 * Lines kept from the connection attempt. Enough to hold a full protocol sweep,
 * which is exactly the case where somebody needs to read it.
 */
const TRACE_LIMIT = 40;

/**
 * Rounds of secure-then-insecure dialling before giving up on a device.
 * Android RFCOMM fails transiently — "read failed, socket might closed" is the
 * usual wording, most often right after a previous session released the socket
 * — and one more round after a short pause clears the majority of those.
 */
const CONNECT_ROUNDS = 2;
const CONNECT_RETRY_DELAY_MS = 800;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** What one `0100` told us. */
type Probe = {
  /** The vehicle answered. Nothing else matters when this is true. */
  answered: boolean;
  /** Nothing came back at all, as opposed to a reply that carried bad news. */
  silent: boolean;
  reason: string;
};

/** Keeps a stray adapter message readable in a log line or an error. */
function summarize(data: string): string {
  const text = data.replace(/[\r\n]+/g, ' ').trim();
  if (!text) return '(an empty message)';
  return text.length > 60 ? `"${text.slice(0, 60)}…"` : `"${text}"`;
}

type PendingCommand = {
  cmd: string;
  resolve: (value: string) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  /** The last message that arrived but did not answer this command. */
  discarded: string | null;
};

export class Elm327Client {
  private readonly device: BluetoothDevice;
  private readSubscription: BluetoothEventSubscription | null = null;
  private pending: PendingCommand | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private disposed = false;
  private needsResync = false;
  private recovering = false;
  private consecutiveFailures = 0;
  private troubleReported = false;
  private troubleHandler: (() => void) | null = null;
  private protocolId: string | null = null;
  private trace: string[] = [];

  private constructor(device: BluetoothDevice) {
    this.device = device;
  }

  get address(): string {
    return this.device.address;
  }

  get name(): string {
    return this.device.name;
  }

  /** The bus the car turned out to be on, once it has answered. */
  get protocol(): string | null {
    return this.protocolId ? (PROTOCOL_NAMES[this.protocolId] ?? null) : null;
  }

  /**
   * What the last connection attempt did, step by step.
   *
   * A car that still will not answer is otherwise a single sentence with
   * nothing behind it; this is the difference between "it does not work" and
   * knowing which protocols were tried and what the adapter said to each.
   */
  get connectionTrace(): string[] {
    return [...this.trace];
  }

  static async connect(address: string): Promise<Elm327Client> {
    // A discovery scan monopolises the radio and reliably kills an RFCOMM open.
    await RNBluetoothClassic.cancelDiscovery().catch(() => undefined);

    let lastError: unknown = null;

    for (let round = 1; round <= CONNECT_ROUNDS; round += 1) {
      if (round > 1) await delay(CONNECT_RETRY_DELAY_MS);

      try {
        return new Elm327Client(await RNBluetoothClassic.connectToDevice(address, ELM327_CONNECTION_OPTIONS));
      } catch (secureError) {
        lastError = secureError;
        console.log(`${LOG_PREFIX} secure connect failed, retrying insecure:`, describeError(secureError));
      }

      try {
        return new Elm327Client(await RNBluetoothClassic.connectToDevice(address, ELM327_INSECURE_OPTIONS));
      } catch (insecureError) {
        lastError = insecureError;
        console.log(`${LOG_PREFIX} insecure connect failed, round ${round}:`, describeError(insecureError));
      }
    }

    throw lastError instanceof Error ? lastError : new Error(describeError(lastError));
  }

  /** Configures the adapter. Individual steps are allowed to fail. */
  async initializeAdapter(onProgress?: (label: string) => void): Promise<void> {
    this.trace = [];
    await this.device.clear().catch(() => undefined);
    this.attachReader();
    await this.runInitSequence(onProgress);
  }

  /**
   * Called when the link has stopped answering, before giving up on it.
   *
   * Fires once per run of trouble; a command that gets answered clears the
   * count, so a link that recovers on its own can report trouble again later.
   */
  onTrouble(handler: (() => void) | null): void {
    this.troubleHandler = handler;
  }

  /**
   * Re-runs adapter setup on a link that has gone quiet.
   *
   * The usual cause is the adapter rebooting — cranking browns out the OBD port
   * and a clone comes back with its configuration lost, echoing commands and
   * with no protocol selected. Nothing about that heals on its own, and the
   * alternative to redoing the setup is a screen of readings that never change
   * again.
   */
  async recover(): Promise<void> {
    if (this.disposed) throw new Error('Not connected');
    if (this.recovering) return;

    this.recovering = true;
    this.consecutiveFailures = 0;

    try {
      this.note('Link restarting', 'the adapter stopped answering');
      this.failPending(new Error('Restarting the link'));

      await delay(RESYNC_DELAY_MS);
      await this.device.clear().catch(() => undefined);
      this.needsResync = false;

      await this.runInitSequence();
      await this.connectEcu();
    } finally {
      this.recovering = false;
      this.consecutiveFailures = 0;
      this.troubleReported = false;
    }
  }

  /**
   * Proves the vehicle answers, and settles which bus it is on. Rejects when no
   * protocol reaches it.
   *
   * Auto-detection gets first go and most cars never need anything else. What
   * follows is the part that was missing: asking the adapter to speak each
   * protocol by name. `ATSP0` is a single guess made by the cheapest chip in
   * the chain, and when it guesses wrong — routinely, on the older non-CAN
   * buses and on clone hardware — repeating it changes nothing. Naming the
   * protocols is why a workshop tool connects to a car this app could not.
   */
  async connectEcu(onProgress?: (label: string) => void): Promise<void> {
    // The last thing the adapter actually said, as opposed to the many probes
    // that simply ran out of time. It is the only part of a failed attempt
    // worth putting in front of a driver.
    let heard: string | null = null;
    let silent = 0;
    let sweeping = false;

    const known = this.protocolId;

    for (const step of buildHandshakePlan(known)) {
      if (this.disposed) throw new Error('Not connected');

      if (step.abandonable) {
        // Silence before the sweep meant only that auto-detection was still
        // searching when the app stopped waiting, so the count starts here.
        if (!sweeping) {
          sweeping = true;
          silent = 0;
        }

        if (silent >= SILENT_PROBES_BEFORE_GIVING_UP) {
          throw new Error(
            'The adapter stopped answering. Unplug it, plug it back in, then connect again.',
          );
        }
      }

      if (step.select) {
        try {
          await this.send(`ATSP${step.select}`, PROTOCOL_SELECT_TIMEOUT_MS, true);
        } catch (error) {
          this.note(step.label, describeError(error));
          silent += 1;
          continue;
        }
      }

      onProgress?.(step.label);
      const probe = await this.probeEcu(step.label, step.timeoutMs);

      if (probe.answered) {
        // An adapter too old to answer `ATDPN` leaves the protocol unnamed, so
        // fall back to the one this step forced, then to the one already known.
        this.protocolId = this.protocolId ?? step.select ?? known;
        return;
      }

      if (probe.silent) {
        silent += 1;
      } else {
        silent = 0;
        heard = probe.reason;
      }
    }

    // Leave auto-detection armed rather than whichever bus was tried last, so
    // the next attempt starts from a clean search.
    this.protocolId = null;
    await this.send(PROTOCOL_RESET.cmd, PROTOCOL_RESET.timeoutMs, true).catch(() => undefined);
    await this.noteBatteryVoltage();

    throw new Error(
      heard
        ? `The car never answered, on any protocol (last: ${heard}). Check the ignition is on and the adapter is pushed fully into the port.`
        : 'The car never answered, on any protocol. Check the ignition is on and the adapter is pushed fully into the port.',
    );
  }

  /** One `0100`, and what to make of the answer. */
  private async probeEcu(label: string, timeoutMs: number): Promise<Probe> {
    try {
      const raw = await this.send(ECU_HANDSHAKE.cmd, timeoutMs, true);
      const response = parseResponse(raw);

      if (response.ok && markerOffset(response.hex, '4100') !== -1) {
        this.protocolId = await this.readProtocolId();
        this.note(label, this.protocol ? `answered on ${this.protocol}` : 'answered');
        return { answered: true, silent: false, reason: '' };
      }

      const reason = response.ok ? 'a reply carrying no readings' : response.reason;
      this.note(label, reason);

      return { answered: false, silent: false, reason };
    } catch (error) {
      const reason = describeError(error);
      this.note(label, reason);

      // The adapter may still be working through a protocol it was cut off
      // mid-way; anything it eventually says belongs to nobody, so let it land
      // while nothing is waiting for it.
      await delay(RESYNC_DELAY_MS);

      return { answered: false, silent: true, reason };
    }
  }

  /**
   * Records what the adapter sees on the battery pin, for the connection trace.
   *
   * OBD pin 16 is powered whenever the adapter is seated, so a reading around
   * 12 V separates "the car is not talking" from "the adapter is not really in
   * the port" — the two cases the same error message otherwise lumps together.
   */
  private async noteBatteryVoltage(): Promise<void> {
    try {
      const raw = (await this.send('ATRV', 2000, true)).replace(/[\r\n]+/g, ' ').trim();
      this.note('Voltage at the OBD port', raw || '(no reading)');
    } catch {
      this.note('Voltage at the OBD port', 'no answer');
    }
  }

  /** Which protocol the adapter ended up using, as an `ATSP` digit. */
  private async readProtocolId(): Promise<string | null> {
    try {
      return protocolIdFromReply(await this.send(PROTOCOL_QUERY.cmd, PROTOCOL_QUERY.timeoutMs, true));
    } catch {
      return null;
    }
  }

  /** Runs a command and parses the reply into a hex payload. */
  async query(command: string, timeoutMs = 5000): Promise<ObdResponse> {
    const raw = await this.sendCommand(command, timeoutMs);
    return parseResponse(raw);
  }

  /**
   * Walks the support bitmask chain to find every PID the ECU implements.
   * Each block advertises whether the following block exists, so the walk stops
   * at the first block that does not chain onward.
   */
  async discoverSupportedPids(): Promise<string[]> {
    const supported: string[] = [];

    for (const block of SUPPORT_BLOCK_PIDS) {
      let response: ObdResponse;
      try {
        response = await this.query(`01${block}`, 4000);
      } catch {
        break;
      }

      if (!response.ok) break;

      const payload = extractPayload(response.hex, '41', block);
      if (!payload || payload.length < 4) break;

      const block_pids = decodeSupportMask(block, payload.slice(0, 4));
      supported.push(...block_pids);

      if (!chainsToNextBlock(block, block_pids)) break;
    }

    return supported;
  }

  /** Reads a Mode 09 support mask the same way, for vehicle information. */
  async discoverSupportedInfoTypes(): Promise<string[]> {
    try {
      const response = await this.query('0900', 4000);
      if (!response.ok) return [];

      const payload = extractPayload(response.hex, '49', '00');
      if (!payload || payload.length < 4) return [];

      return decodeSupportMask('00', payload.slice(0, 4));
    } catch {
      return [];
    }
  }

  /**
   * ELM327 is half-duplex: one command at a time, and a second write before the
   * first reply corrupts both. Sends link onto a single chain so concurrent
   * callers queue rather than interleave.
   */
  sendCommand(cmd: string, timeoutMs = 5000): Promise<string> {
    return this.send(cmd, timeoutMs, false);
  }

  private send(cmd: string, timeoutMs: number, privileged: boolean): Promise<string> {
    const run = this.queue.then(
      () => this.writeAndAwait(cmd, timeoutMs, privileged),
      () => this.writeAndAwait(cmd, timeoutMs, privileged),
    );

    // Swallowed here so one rejection cannot wedge the chain; the caller still
    // sees `run` reject.
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );

    return run;
  }

  async disconnect(): Promise<void> {
    this.disposed = true;
    this.troubleHandler = null;
    this.failPending(new Error('Disconnected'));

    this.readSubscription?.remove();
    this.readSubscription = null;

    try {
      await this.device.disconnect();
    } catch (error) {
      console.log(`${LOG_PREFIX} disconnect failed:`, describeError(error));
    }
  }

  private async runInitSequence(onProgress?: (label: string) => void): Promise<void> {
    let answered = 0;

    for (const step of [...ADAPTER_INIT_SEQUENCE, this.protocolStep()]) {
      if (this.disposed) throw new Error('Disconnected during initialization');
      onProgress?.(step.label);

      try {
        await this.send(step.cmd, step.timeoutMs, true);
        answered += 1;
      } catch (error) {
        this.note(step.cmd, describeError(error));
      }

      if (step.settleMs) {
        await delay(step.settleMs);
        await this.device.clear().catch(() => undefined);
      }
    }

    // Individual steps may fail, but a socket that opened and then answered
    // nothing at all is not an ELM327 that is listening. Saying so here costs
    // seconds; carrying on used to cost the full protocol sweep — minutes of
    // waiting that ended by blaming the car.
    if (answered === 0) {
      throw new Error(
        'The adapter accepted the connection but never answered a command. It may be unpowered, or not an OBD adapter.',
      );
    }
  }

  /**
   * How to arm the adapter before the first request.
   *
   * A protocol this car has already answered on is worth going straight back
   * to. It saves the search on every reconnect, and after the adapter reboots
   * mid-drive it is the difference between picking the readings back up and
   * negotiating from nothing while the car is moving.
   */
  private protocolStep(): InitStep {
    if (!this.protocolId) return PROTOCOL_RESET;

    return {
      cmd: `ATSP${this.protocolId}`,
      label: `Selecting ${PROTOCOL_NAMES[this.protocolId] ?? 'protocol'}`,
      timeoutMs: PROTOCOL_SELECT_TIMEOUT_MS,
    };
  }

  /** Adds a line to the report of what this connection attempt did. */
  private note(step: string, outcome: string): void {
    const line = `${step}: ${outcome}`;
    console.log(`${LOG_PREFIX} ${line}`);

    this.trace.push(line);
    if (this.trace.length > TRACE_LIMIT) this.trace.shift();
  }

  private failPending(reason: Error): void {
    const entry = this.pending;
    if (!entry) return;

    this.pending = null;
    clearTimeout(entry.timer);
    entry.reject(reason);
  }

  private noteFailure(): void {
    if (this.recovering) return;

    this.consecutiveFailures += 1;

    // Reported once per run of trouble rather than on every command until it
    // clears. Answering anything resets both, so a link that goes bad a second
    // time is reported a second time.
    if (this.consecutiveFailures < TROUBLE_THRESHOLD || this.troubleReported) return;
    if (!this.troubleHandler) return;

    this.troubleReported = true;
    this.troubleHandler();
  }

  private attachReader(): void {
    this.readSubscription?.remove();

    this.readSubscription = this.device.onDataReceived((event) => {
      const data = event.data ?? '';
      const entry = this.pending;

      // Nothing is waiting, so this is a late answer to a command that already
      // gave up. Dropping it is the point: it is no longer anyone's reply.
      if (!entry) return;

      // The reply has to answer the command that is waiting for it. An adapter
      // that emits one message more than it was asked for used to put every
      // later reply one command behind, permanently and silently — readings
      // simply stopped changing. Absorbing the extra message costs one command.
      if (!acceptsReply(entry.cmd, data)) {
        entry.discarded = data;
        console.log(`${LOG_PREFIX} ${entry.cmd}: ignored ${summarize(data)}`);
        return;
      }

      this.pending = null;
      clearTimeout(entry.timer);
      const health = linkReplyHealth(entry.cmd, data);
      if (health === 'failure') {
        this.noteFailure();
      } else if (health === 'healthy') {
        this.consecutiveFailures = 0;
        this.troubleReported = false;
      }
      entry.resolve(data);
    });
  }

  private async writeAndAwait(cmd: string, timeoutMs: number, privileged: boolean): Promise<string> {
    if (this.disposed) throw new Error('Not connected');

    // Setup owns the link while it runs, so ordinary traffic is turned away
    // rather than queued behind it — a stream of stale queries landing between
    // configuration commands is how the last attempt to fix this went wrong.
    if (this.recovering && !privileged) throw new Error('The link is restarting');

    if (this.needsResync) {
      this.needsResync = false;
      await delay(RESYNC_DELAY_MS);
      await this.device.clear().catch(() => undefined);
      if (this.disposed) throw new Error('Not connected');
    }

    return new Promise<string>((resolve, reject) => {
      const entry: PendingCommand = {
        cmd,
        resolve,
        reject,
        discarded: null,
        timer: setTimeout(() => {
          if (this.pending === entry) {
            this.pending = null;
            this.needsResync = true;
          }
          this.noteFailure();
          reject(
            new Error(
              entry.discarded
                ? `"${cmd}" was answered with ${summarize(entry.discarded)}`
                : `No response to "${cmd}" after ${timeoutMs}ms`,
            ),
          );
        }, timeoutMs),
      };

      this.pending = entry;

      this.device.write(cmd + COMMAND_TERMINATOR, 'ascii').catch((error: unknown) => {
        if (this.pending === entry) this.pending = null;
        clearTimeout(entry.timer);
        // Part of the command may have gone out, so the adapter could still
        // answer something. Drain before writing again.
        this.needsResync = true;
        this.noteFailure();
        reject(new Error(describeError(error)));
      });
    });
  }
}

export function describeError(error: unknown): string {
  if (error instanceof Error) return humanizeBluetoothError(error.message);
  if (typeof error === 'string') return humanizeBluetoothError(error);
  if (error && typeof error === 'object' && 'message' in error) {
    return humanizeBluetoothError(String((error as { message: unknown }).message));
  }
  return 'Unknown error';
}

export { responseModeFor };
