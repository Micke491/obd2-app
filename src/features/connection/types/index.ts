import type { BluetoothDevice } from 'react-native-bluetooth-classic';

/** Each link is tracked separately because they fail for unrelated reasons. */
export type LinkState = 'idle' | 'pending' | 'ready' | 'failed';

export type ObdStatus = 'idle' | 'connecting' | 'connected' | 'error';

export type ObdConnectionState = {
  status: ObdStatus;
  /** Bluetooth socket plus adapter configuration. */
  adapter: LinkState;
  /** Vehicle answering OBD requests. */
  ecu: LinkState;
  device: BluetoothDevice | null;
  error: string | null;
  progress: string | null;
  /** The bus the car turned out to be on, once it has answered. */
  protocol: string | null;
  /**
   * What the last connection attempt did, step by step. A car that will not
   * answer is otherwise a single sentence with nothing behind it.
   */
  log: string[];
  /** Mode 01 PIDs the ECU reports as implemented. */
  supportedPids: string[];
};
