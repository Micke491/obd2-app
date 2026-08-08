/** The shape ranking needs. `BluetoothDevice` satisfies it structurally. */
export type AdapterCandidate = { name?: string | null; address: string };

/**
 * Name fragments common to ELM327 adapters and clones. Matching is used to rank
 * candidates, never to hide devices, since adapter naming is not standardised.
 */
const OBD_NAME_HINTS = ['OBD', 'ELM', 'VLINK', 'VGATE', 'VIECAR', 'KONNWEI', 'SCAN', 'ICAR', 'VEEPEAK'];

export function looksLikeObdAdapter(device: AdapterCandidate): boolean {
  const name = (device.name ?? '').toUpperCase().replace(/[\s-_]/g, '');
  return OBD_NAME_HINTS.some((hint) => name.includes(hint));
}

/**
 * Orders the paired devices by how likely each is to be the adapter in the car.
 *
 * Nothing is remembered between sessions and nothing is filtered out. The names
 * that read as an adapter go first, then everything else paired, because adapter
 * naming is not standardised and a brand-new one out of the box can call itself
 * anything at all. Ruling those out used to mean the app refused to try the only
 * device that would have worked; trying them last costs nothing on a phone where
 * the first guess is right, which is nearly all of them.
 */
export function rankAdapterCandidates<T extends AdapterCandidate>(bonded: T[]): T[] {
  const named = bonded.filter((device) => looksLikeObdAdapter(device));
  const rest = bonded.filter((device) => !looksLikeObdAdapter(device));

  return [...named, ...rest];
}
