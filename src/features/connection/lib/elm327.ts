import RNBluetoothClassic, {
  type BluetoothDevice,
  type BluetoothEventSubscription,
} from 'react-native-bluetooth-classic';

import {
  COMMAND_TERMINATOR,
  ELM327_CONNECTION_OPTIONS,
  ELM327_INSECURE_OPTIONS,
  ERROR_RESPONSES,
  INIT_SEQUENCE,
} from './at-commands';

/** Logged to the Metro console so a failed car test is still diagnosable. */
const LOG_PREFIX = '[ELM327]';

/**
 * Pause after a timeout before writing again.
 *
 * The protocol carries no request ids, so a reply can only be matched to a
 * command by being the next thing to arrive. After a timeout the previous reply
 * may still be in flight, and if it lands once the following command has been
 * written it would satisfy the wrong one. Waiting first means it arrives while
 * nothing is pending, where the reader discards it.
 */
const RESYNC_DELAY_MS = 300;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type PendingCommand = {
  resolve: (value: string) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  cmd: string;
};

export class Elm327Client {
  private readonly device: BluetoothDevice;
  private readSubscription: BluetoothEventSubscription | null = null;
  private pending: PendingCommand | null = null;
  /** Tail of the command chain. Every send links onto this. */
  private queue: Promise<unknown> = Promise.resolve();
  private disposed = false;
  /** Set by a timeout; makes the next write resynchronise first. */
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

  /**
   * Opens an RFCOMM socket, falling back to an insecure one.
   *
   * Cheap ELM327 clones frequently refuse the secure socket that Android
   * prefers, and fail in a way indistinguishable from "adapter not there". The
   * retry costs one round-trip and turns a hard failure into a working
   * connection on a lot of sub-$15 hardware.
   */
  static async connect(address: string): Promise<Elm327Client> {
    let device: BluetoothDevice;

    try {
      console.log(`${LOG_PREFIX} connecting (secure) to ${address}`);
      device = await RNBluetoothClassic.connectToDevice(address, ELM327_CONNECTION_OPTIONS);
    } catch (secureError) {
      console.log(`${LOG_PREFIX} secure connect failed, retrying insecure:`, describeError(secureError));
      device = await RNBluetoothClassic.connectToDevice(address, ELM327_INSECURE_OPTIONS);
    }

    console.log(`${LOG_PREFIX} socket open to ${device.name} (${device.address})`);
    return new Elm327Client(device);
  }

  /**
   * Runs the ELM327 handshake. Resolves once the vehicle has answered a real
   * OBD query; rejects if it never does.
   */
  async initialize(onProgress?: (label: string) => void): Promise<void> {
    // Drain anything the adapter buffered before we attached a reader,
    // otherwise the first response is whatever the previous session left behind.
    await this.device.clear().catch(() => undefined);
    this.attachReader();

    for (const step of INIT_SEQUENCE) {
      if (this.disposed) throw new Error('Disconnected during initialization');
      onProgress?.(step.label);

      try {
        const response = await this.sendCommand(step.cmd, step.timeoutMs);

        if (step.required) {
          const failure = findErrorResponse(response);
          if (failure) {
            throw new Error(`Adapter reported "${failure}". Is the ignition on?`);
          }
        }
      } catch (error) {
        if (step.required) throw error;
        console.log(`${LOG_PREFIX} optional step ${step.cmd} failed, continuing:`, describeError(error));
      }
    }
  }

  /**
   * Sends one command and resolves with the adapter's raw reply.
   *
   * ELM327 is strictly half-duplex: it processes exactly one command at a time,
   * and a second write before the first reply arrives corrupts both. Every call
   * therefore links onto a single promise chain, so concurrent callers queue
   * instead of interleaving.
   */
  sendCommand(cmd: string, timeoutMs = 5000): Promise<string> {
    const run = this.queue.then(
      () => this.writeAndAwait(cmd, timeoutMs),
      () => this.writeAndAwait(cmd, timeoutMs),
    );

    // The chain must survive a rejected command, or one timeout would wedge
    // every later send. Swallow here; the caller still sees `run` reject.
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
      console.log(`${LOG_PREFIX} disconnected from ${this.device.address}`);
    } catch (error) {
      console.log(`${LOG_PREFIX} disconnect failed:`, describeError(error));
    }
  }

  /**
   * One read event is one complete response, because the connection splits on
   * the `>` prompt rather than on newlines.
   */
  private attachReader(): void {
    this.readSubscription?.remove();

    this.readSubscription = this.device.onDataReceived((event) => {
      const data = event.data ?? '';
      console.log(`${LOG_PREFIX} <<`, JSON.stringify(data));

      const entry = this.pending;
      if (!entry) {
        // Late reply to a command that already timed out. Dropping it keeps the
        // next command from resolving against a stale response.
        return;
      }

      this.pending = null;
      clearTimeout(entry.timer);
      entry.resolve(data);
    });
  }

  private async writeAndAwait(cmd: string, timeoutMs: number): Promise<string> {
    if (this.disposed) throw new Error('Not connected');

    if (this.needsResync) {
      // Consumed once per timeout, so a permanently dead adapter cannot get
      // stuck alternating between a discarded reply and a fresh timeout.
      this.needsResync = false;
      await delay(RESYNC_DELAY_MS);
      await this.device.clear().catch(() => undefined);
      if (this.disposed) throw new Error('Not connected');
    }

    return new Promise<string>((resolve, reject) => {
      const entry: PendingCommand = {
        resolve,
        reject,
        cmd,
        timer: setTimeout(() => {
          if (this.pending === entry) {
            this.pending = null;
            this.needsResync = true;
          }
          reject(new Error(`No response to "${cmd}" after ${timeoutMs}ms`));
        }, timeoutMs),
      };

      this.pending = entry;

      console.log(`${LOG_PREFIX} >>`, cmd);
      this.device.write(cmd + COMMAND_TERMINATOR, 'ascii').catch((error: unknown) => {
        if (this.pending === entry) this.pending = null;
        clearTimeout(entry.timer);
        reject(new Error(describeError(error)));
      });
    });
  }
}

/** Returns the adapter error contained in a response, if any. */
export function findErrorResponse(raw: string): string | null {
  const upper = raw.toUpperCase();
  return ERROR_RESPONSES.find((marker) => upper.includes(marker)) ?? null;
}

export function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Unknown error';
}
