import RNBluetoothClassic, { type BluetoothDevice } from 'react-native-bluetooth-classic';

import { rankAdapterCandidates } from './adapter-ranking';

export { looksLikeObdAdapter } from './adapter-ranking';

export class NoAdapterError extends Error {}

/**
 * Every device worth dialling, best guess first.
 *
 * Pairing cannot be done reliably from inside an app, so this only considers
 * already-bonded devices. Returning a list rather than a single winner is the
 * point: the first guess is tried, not trusted, and an adapter whose name the
 * app does not recognise still gets its turn instead of ending the attempt.
 */
export async function findAdapterCandidates(): Promise<BluetoothDevice[]> {
  const enabled = await RNBluetoothClassic.isBluetoothEnabled();
  if (!enabled) {
    await RNBluetoothClassic.requestBluetoothEnabled();
  }

  const ranked = rankAdapterCandidates(await RNBluetoothClassic.getBondedDevices());

  if (ranked.length === 0) {
    throw new NoAdapterError(
      'No paired Bluetooth devices. Pair your adapter in Android Bluetooth settings first — the PIN is usually 1234 or 0000.',
    );
  }

  return ranked;
}
