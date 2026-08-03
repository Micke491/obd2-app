import type { BluetoothDevice } from 'react-native-bluetooth-classic';

/**
 * Lifecycle of an adapter session.
 *
 * `connecting` covers opening the Bluetooth socket; `initializing` covers the
 * ELM327 handshake that follows. They are separate because the handshake is by
 * far the slower of the two and fails for entirely different reasons — keeping
 * them distinct is what lets the connect screen say which half went wrong.
 */
export type ObdStatus = 'idle' | 'connecting' | 'initializing' | 'connected' | 'error';

export type ObdConnectionState = {
  status: ObdStatus;
  device: BluetoothDevice | null;
  /** Human-readable failure reason, cleared on the next connect attempt. */
  error: string | null;
  /** Current handshake step, shown while `status` is `initializing`. */
  progress: string | null;
};

export type PermissionState = 'unknown' | 'granted' | 'denied';
