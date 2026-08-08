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
 * The adapter that worked last time goes first, but it is tried, not trusted.
 * Somebody who owns two adapters swaps them, and the remembered one being
 * unpowered used to end the attempt right there — with a raw Java socket error
 * for an explanation. Every other OBD-looking device follows, so whichever
 * adapter is actually plugged in gets its turn.
 */
export function rankAdapterCandidates<T extends AdapterCandidate>(
  bonded: T[],
  preferredAddress?: string | null,
): T[] {
  const remembered = preferredAddress
    ? bonded.filter((device) => device.address === preferredAddress)
    : [];
  const named = bonded.filter(
    (device) => device.address !== preferredAddress && looksLikeObdAdapter(device),
  );

  const ranked = [...remembered, ...named];
  if (ranked.length > 0) return ranked;

  // A phone paired with exactly one device has nothing to disambiguate.
  return bonded.length === 1 ? [...bonded] : [];
}
