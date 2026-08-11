import type { ModuleFault } from '@/lib/obd/uds/faults';
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

export type PartStaleness = 'awake' | 'partly-asleep' | 'asleep';

/**
 * Whether a part's checklist row should read as sleeping, and how much.
 *
 * Staleness is a per-module fact, but the checklist ticks a whole part at
 * once, so a part with a mix of answering and quiet modules is neither
 * "fine" nor "gone" -- it has to say so, rather than reading as identical to
 * one or the other because the two easy cases got all the attention.
 */
export function partStaleness(modules: DiscoveredModule[]): PartStaleness {
  if (modules.length === 0) return 'awake';
  const staleCount = modules.filter((module) => module.stale).length;
  if (staleCount === 0) return 'awake';
  return staleCount === modules.length ? 'asleep' : 'partly-asleep';
}

/**
 * `Aug 1`, or a hedge for a date that cannot be read at all.
 *
 * Shared so a module's card and the checklist row for its part cannot drift:
 * both are showing the same `lastSeenAt`, and used to format it independently.
 */
export function formatLastSeen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'an earlier scan';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export type ModuleFaultState =
  | { kind: 'asleep' }
  | { kind: 'faults'; count: number; failingNow: boolean }
  | { kind: 'clean' }
  | { kind: 'unreadable'; count: number }
  | { kind: 'unknown' };

/**
 * What a module's card should say it found, from what was actually learned.
 *
 * The order matters and is deliberate:
 *
 * 1. Asleep beats everything else. A module goes stale exactly when it was
 *    asked this run and stayed quiet -- `foldScanIntoMap` marks it stale and
 *    the caller clears its cached fault list with the same `asked` set, in
 *    the same step -- so a stale module never has anything fresh to report.
 *    Checking this first is what stops a module that carries an old nonzero
 *    `faultCount` from before it went quiet from reading as "Reported N
 *    faults, but would not list them": a live refusal, when what actually
 *    happened is that nothing was there to ask.
 * 2. A real fault list, when there is one, is reported by its own length --
 *    not by `module.faultCount`. `19 01`'s count and `19 02`'s list are
 *    separate requests, and a byte group that fails to decode is dropped
 *    from the list but not from the count, so the two can disagree; the
 *    list is what a module's card actually renders and lets a driver tap
 *    into, so it is the number that has to match what is on screen.
 * 3. Failing that, an honest zero, a count with no list behind it, and no
 *    count at all are told apart exactly as they always were.
 */
export function moduleFaultState(module: DiscoveredModule, faults: ModuleFault[]): ModuleFaultState {
  if (module.stale) return { kind: 'asleep' };
  if (faults.length > 0) {
    return { kind: 'faults', count: faults.length, failingNow: faults.some((fault) => fault.status.failingNow) };
  }
  if (module.faultCount === 0) return { kind: 'clean' };
  if (module.faultCount !== null) return { kind: 'unreadable', count: module.faultCount };
  return { kind: 'unknown' };
}
