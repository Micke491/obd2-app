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
  /** Mode 01 PIDs the ECU reports as implemented. */
  supportedPids: string[];
};
