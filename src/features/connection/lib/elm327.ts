import RNBluetoothClassic, {
  type BluetoothDevice,
  type BluetoothEventSubscription,
} from 'react-native-bluetooth-classic';

import { markerOffset, parseResponse, responseModeFor, type ObdResponse } from '@/lib/obd/protocol';
import { acceptsReply, linkReplyHealth } from '@/lib/obd/reply-match';
import { SUPPORT_BLOCK_PIDS, chainsToNextBlock, decodeSupportMask } from '@/lib/obd/supported';
import { extractPayload } from '@/lib/obd/protocol';

import {
  ADAPTER_INIT_SEQUENCE,
  COMMAND_TERMINATOR,
  ECU_HANDSHAKE,
  ECU_HANDSHAKE_ATTEMPTS,
  ELM327_CONNECTION_OPTIONS,
  ELM327_INSECURE_OPTIONS,
  PROTOCOL_RESET,
} from './at-commands';

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

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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

  private constructor(device: BluetoothDevice) {
    this.device = device;
  }

  get address(): string {
    return this.device.address;
  }

  get name(): string {
    return this.device.name;
  }

  static async connect(address: string): Promise<Elm327Client> {
    let device: BluetoothDevice;

    try {
      device = await RNBluetoothClassic.connectToDevice(address, ELM327_CONNECTION_OPTIONS);
    } catch (secureError) {
      console.log(`${LOG_PREFIX} secure connect failed, retrying insecure:`, describeError(secureError));
      device = await RNBluetoothClassic.connectToDevice(address, ELM327_INSECURE_OPTIONS);
    }

    return new Elm327Client(device);
  }

  /** Configures the adapter. Individual steps are allowed to fail. */
  async initializeAdapter(onProgress?: (label: string) => void): Promise<void> {
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

  /** Proves the vehicle answers. Rejects when it does not. */
  async connectEcu(): Promise<void> {
    let reason = 'The ECU did not answer.';

    for (let attempt = 1; attempt <= ECU_HANDSHAKE_ATTEMPTS; attempt += 1) {
      if (this.disposed) throw new Error('Not connected');

      try {
        const raw = await this.send(ECU_HANDSHAKE.cmd, ECU_HANDSHAKE.timeoutMs, true);
        const response = parseResponse(raw);

        if (response.ok && markerOffset(response.hex, '4100') !== -1) return;

        reason = response.ok
          ? 'The ECU did not answer a standard request.'
          : `${response.reason}. Check the ignition is on.`;
      } catch (error) {
        reason = describeError(error);
      }

      if (attempt < ECU_HANDSHAKE_ATTEMPTS) {
        // Auto-detection often gives up on its first pass and finds the
        // protocol on the next, so re-arm it rather than declaring failure.
        await this.send(PROTOCOL_RESET.cmd, PROTOCOL_RESET.timeoutMs, true).catch(() => undefined);
        await delay(RESYNC_DELAY_MS);
      }
    }

    throw new Error(reason);
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
    for (const step of ADAPTER_INIT_SEQUENCE) {
      if (this.disposed) throw new Error('Disconnected during initialization');
      onProgress?.(step.label);

      try {
        await this.send(step.cmd, step.timeoutMs, true);
      } catch (error) {
        console.log(`${LOG_PREFIX} ${step.cmd} failed, continuing:`, describeError(error));
      }

      if (step.settleMs) {
        await delay(step.settleMs);
        await this.device.clear().catch(() => undefined);
      }
    }
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
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Unknown error';
}

export { responseModeFor };
