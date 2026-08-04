import RNBluetoothClassic, { type BluetoothDevice } from 'react-native-bluetooth-classic';

/**
 * Name fragments common to ELM327 adapters and clones. Matching is used to rank
 * candidates, never to hide devices, since adapter naming is not standardised.
 */
const OBD_NAME_HINTS = ['OBD', 'ELM', 'VLINK', 'VGATE', 'VIECAR', 'KONNWEI', 'SCAN', 'ICAR', 'VEEPEAK'];

export function looksLikeObdAdapter(device: BluetoothDevice): boolean {
  const name = (device.name ?? '').toUpperCase().replace(/[\s-_]/g, '');
  return OBD_NAME_HINTS.some((hint) => name.includes(hint));
}

export class NoAdapterError extends Error {}

/**
 * Picks the adapter to connect to.
 *
 * Pairing cannot be done reliably from inside an app, so this only considers
 * already-bonded devices. The adapter that worked last time wins outright — on
 * a phone paired with a car stereo, a headset and a dongle, the name heuristic
 * alone gives up, and remembering turns that dead end into a silent success.
 */
export async function findAdapter(preferredAddress?: string | null): Promise<BluetoothDevice> {
  const enabled = await RNBluetoothClassic.isBluetoothEnabled();
  if (!enabled) {
    await RNBluetoothClassic.requestBluetoothEnabled();
  }

  const bonded = await RNBluetoothClassic.getBondedDevices();

  if (preferredAddress) {
    const remembered = bonded.find((device) => device.address === preferredAddress);
    if (remembered) return remembered;
  }

  const named = bonded.find(looksLikeObdAdapter);
  if (named) return named;

  if (bonded.length === 1) return bonded[0];

  throw new NoAdapterError(
    bonded.length === 0
      ? 'No paired Bluetooth devices. Pair your adapter in Android Bluetooth settings first — the PIN is usually 1234 or 0000.'
      : 'No OBD adapter recognised among your paired devices. Pair the adapter, or unpair devices you are not using.',
  );
}
