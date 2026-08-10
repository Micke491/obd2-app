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
