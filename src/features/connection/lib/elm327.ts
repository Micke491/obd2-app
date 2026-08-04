import RNBluetoothClassic, {
  type BluetoothDevice,
  type BluetoothEventSubscription,
} from 'react-native-bluetooth-classic';

import { parseResponse, responseModeFor, type ObdResponse } from '@/lib/obd/protocol';
import { SUPPORT_BLOCK_PIDS, chainsToNextBlock, decodeSupportMask } from '@/lib/obd/supported';
import { extractPayload } from '@/lib/obd/protocol';

import {
  ADAPTER_INIT_SEQUENCE,
  COMMAND_TERMINATOR,
  ECU_HANDSHAKE,
  ELM327_CONNECTION_OPTIONS,
  ELM327_INSECURE_OPTIONS,
} from './at-commands';

const LOG_PREFIX = '[ELM327]';

/**
 * Pause before writing again after a timeout. The protocol has no request ids,
 * so a reply is matched to a command purely by arrival order; a late reply that
 * lands after the next write would satisfy the wrong command. Waiting lets it
 * arrive while nothing is pending, where the reader discards it.
 */
const RESYNC_DELAY_MS = 300;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type PendingCommand = {
  resolve: (value: string) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export class Elm327Client {
  private readonly device: BluetoothDevice;
  private readSubscription: BluetoothEventSubscription | null = null;
  private pending: PendingCommand | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private disposed = false;
  private needsResync = false;

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

    for (const step of ADAPTER_INIT_SEQUENCE) {
      if (this.disposed) throw new Error('Disconnected during initialization');
      onProgress?.(step.label);

      try {
        await this.sendCommand(step.cmd, step.timeoutMs);
      } catch (error) {
        console.log(`${LOG_PREFIX} ${step.cmd} failed, continuing:`, describeError(error));
      }
    }
  }

  /** Proves the vehicle answers. Rejects when it does not. */
  async connectEcu(): Promise<void> {
    const raw = await this.sendCommand(ECU_HANDSHAKE.cmd, ECU_HANDSHAKE.timeoutMs);
    const response = parseResponse(raw);

    if (!response.ok) {
      throw new Error(`${response.reason}. Check the ignition is on.`);
    }
    if (!response.hex.includes('4100')) {
      throw new Error('The ECU did not answer a standard request.');
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
    const run = this.queue.then(
      () => this.writeAndAwait(cmd, timeoutMs),
      () => this.writeAndAwait(cmd, timeoutMs),
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

    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(new Error('Disconnected'));
      this.pending = null;
    }

    this.readSubscription?.remove();
    this.readSubscription = null;

    try {
      await this.device.disconnect();
    } catch (error) {
      console.log(`${LOG_PREFIX} disconnect failed:`, describeError(error));
    }
  }

  private attachReader(): void {
    this.readSubscription?.remove();

    this.readSubscription = this.device.onDataReceived((event) => {
      const data = event.data ?? '';
      const entry = this.pending;
      if (!entry) return;

      this.pending = null;
      clearTimeout(entry.timer);
      entry.resolve(data);
    });
  }

  private async writeAndAwait(cmd: string, timeoutMs: number): Promise<string> {
    if (this.disposed) throw new Error('Not connected');

    if (this.needsResync) {
      this.needsResync = false;
      await delay(RESYNC_DELAY_MS);
      await this.device.clear().catch(() => undefined);
      if (this.disposed) throw new Error('Not connected');
    }

    return new Promise<string>((resolve, reject) => {
      const entry: PendingCommand = {
        resolve,
        reject,
        timer: setTimeout(() => {
          if (this.pending === entry) {
            this.pending = null;
            this.needsResync = true;
          }
          reject(new Error(`No response to "${cmd}" after ${timeoutMs}ms`));
        }, timeoutMs),
      };

      this.pending = entry;

      this.device.write(cmd + COMMAND_TERMINATOR, 'ascii').catch((error: unknown) => {
        if (this.pending === entry) this.pending = null;
        clearTimeout(entry.timer);
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
