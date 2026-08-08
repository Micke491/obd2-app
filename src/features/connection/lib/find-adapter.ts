import RNBluetoothClassic, { type BluetoothDevice } from 'react-native-bluetooth-classic';

import { rankAdapterCandidates } from './adapter-ranking';

export { looksLikeObdAdapter } from './adapter-ranking';

export class NoAdapterError extends Error {}

/**
 * Every adapter worth dialling, best guess first.
 *
 * Pairing cannot be done reliably from inside an app, so this only considers
 * already-bonded devices. Returning a list rather than a single winner is the
 * point: the remembered adapter is tried first, but when it is the one sitting
 * in a drawer, the attempt moves on to the next paired adapter instead of
 * ending there.
 */
export async function findAdapterCandidates(preferredAddress?: string | null): Promise<BluetoothDevice[]> {
  const enabled = await RNBluetoothClassic.isBluetoothEnabled();
  if (!enabled) {
    await RNBluetoothClassic.requestBluetoothEnabled();
  }

  const bonded = await RNBluetoothClassic.getBondedDevices();
  const ranked = rankAdapterCandidates(bonded, preferredAddress);

  if (ranked.length === 0) {
    throw new NoAdapterError(
      bonded.length === 0
        ? 'No paired Bluetooth devices. Pair your adapter in Android Bluetooth settings first — the PIN is usually 1234 or 0000.'
        : 'No OBD adapter recognised among your paired devices. Pair the adapter, or unpair devices you are not using.',
    );
  }

  return ranked;
}
