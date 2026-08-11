import { PART_ORDER, type Part } from '@/lib/obd/uds/parts';

export const MODULE_MAP_VERSION = 1;

export type DiscoveredModule = {
  /** The address asked. All a re-read needs, and how a module is identified. */
  requestId: string;
  part: Part;
  /** What the module called itself, when it answered `22F197`. */
  name: string | null;
  /** Null when the module was present but would not say. */
  faultCount: number | null;
  /** Found before, silent on the last check. Shown, not removed. */
  stale: boolean;
  lastSeenAt: string;
};

export type ModuleMap = {
  version: typeof MODULE_MAP_VERSION;
  vin: string;
  /** The addresses only mean anything on the bus they were found on. */
  protocolId: string;
  discoveredAt: string;
  modules: DiscoveredModule[];
};

/**
 * Folds a re-verification back into the saved map.
 *
 * A module that answers is confirmed and dated. One that stays quiet is marked
 * stale and kept: modules sleep, and a driver who saw "Airbag" in the list
 * yesterday should not find it silently gone today with nothing to explain it.
 */
export function mergeAfterVerify(map: ModuleMap, answered: string[], now: string): ModuleMap {
  const heard = new Set(answered.map((requestId) => requestId.toUpperCase()));

  return {
    ...map,
    modules: map.modules.map((entry) =>
      heard.has(entry.requestId.toUpperCase())
        ? { ...entry, stale: false, lastSeenAt: now }
        : { ...entry, stale: true },
    ),
  };
}

/**
 * Folds a completed scan back into the map.
 *
 * Three cases, and the middle one is the point: a module that was asked and
 * stayed quiet is marked stale rather than dropped, because a module that is
 * asleep is not a module that has been removed. A module that was never asked
 * -- because the sweep was stopped early, or because this scan only covered
 * some parts -- is left exactly as it was, since nothing was learned about it.
 */
export function foldScanIntoMap(
  map: ModuleMap,
  asked: string[],
  found: DiscoveredModule[],
  now: string,
): ModuleMap {
  const askedIds = new Set(asked.map((requestId) => requestId.toUpperCase()));
  const foundById = new Map(found.map((entry) => [entry.requestId.toUpperCase(), entry]));

  const modules = map.modules.map((entry) => {
    const id = entry.requestId.toUpperCase();
    const match = foundById.get(id);
    if (match) return { ...match, stale: false, lastSeenAt: now };
    if (askedIds.has(id)) return { ...entry, stale: true };
    return { ...entry };
  });

  const known = new Set(map.modules.map((entry) => entry.requestId.toUpperCase()));
  const additions = found.filter((entry) => !known.has(entry.requestId.toUpperCase()));

  return { ...map, modules: [...modules, ...additions] };
}

/** Whether a saved map describes the car currently plugged in. */
export function mapAppliesTo(
  map: ModuleMap | null,
  vin: string | null,
  protocolId: string | null,
): boolean {
  if (!map || !vin || !protocolId) return false;
  return map.vin === vin && map.protocolId === protocolId;
}

/** Fixed order, so the results list does not reshuffle between two scans. */
export function groupByPart(
  modules: DiscoveredModule[],
): { part: Part; modules: DiscoveredModule[] }[] {
  return PART_ORDER.map((part) => ({
    part,
    modules: modules.filter((entry) => entry.part === part),
  })).filter((group) => group.modules.length > 0);
}

/**
 * The parts worth offering as filter chips: the app's fixed order, narrowed to
 * whatever these particular modules actually cover. Ten chips for a car with
 * three modules would be clutter nobody could use.
 */
export function availableParts(modules: DiscoveredModule[]): Part[] {
  const present = new Set(modules.map((entry) => entry.part));
  return PART_ORDER.filter((part) => present.has(part));
}

/**
 * Results read most-consequential first: whichever module is carrying the
 * most faults leads. A module whose count was never learned (present, but it
 * would not say) sorts as if it had none, rather than by accident outranking
 * one that is honestly reporting zero or more. Ties break on address, so two
 * modules with the same count do not swap places between renders.
 */
export function sortModulesByFaults(modules: DiscoveredModule[]): DiscoveredModule[] {
  return [...modules].sort((a, b) => {
    const byCount = (b.faultCount ?? 0) - (a.faultCount ?? 0);
    if (byCount !== 0) return byCount;
    return a.requestId < b.requestId ? -1 : a.requestId > b.requestId ? 1 : 0;
  });
}
