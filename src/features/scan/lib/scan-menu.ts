import type { CanAddressing } from '@/lib/obd/uds/addressing';
import { PART_LABELS, PART_ORDER, type Part } from '@/lib/obd/uds/parts';

import { formatLastSeen, type DiscoveredModule, type ModuleMap } from './module-map';

/**
 * Why a row cannot be chosen. Three different facts, told apart because the
 * cure for each is different and a driver deserves to know which one they are
 * looking at.
 */
export type Unavailable =
  /** Nothing is plugged in. Nothing on the menu means anything yet. */
  | 'no-link'
  /** Not a CAN bus, so no module past the engine is addressable at all. */
  | 'not-can'
  /** CAN, but no sweep has found a module for this part yet. */
  | 'not-found';

export const UNAVAILABLE_REASONS: Record<Unavailable, string> = {
  'no-link': 'Not connected to the car.',
  'not-can': "This car's protocol can't reach it.",
  'not-found': 'Not found yet — scan the whole car to look for it.',
};

export type MenuRow = {
  part: Part;
  label: string;
  /** What was found under this part, in the order the map holds them. */
  modules: DiscoveredModule[];
  /** Null when the row can be chosen. */
  unavailable: Unavailable | null;
};

export type ScanMenu = {
  /** The engine is its own row: it is reached by mode 03, not by address. */
  engine: { unavailable: Unavailable | null };
  parts: MenuRow[];
  wholeCar: { unavailable: Unavailable | null };
};

/**
 * The parts worth offering as their own row.
 *
 * `engine` is excluded because it has a row of its own above the list, and
 * `other` because it is the catch-all for a module whose address matched no
 * known pattern -- "Other modules -- not found yet, scan the whole car to look
 * for it" names nothing a driver could recognise or want. `other` still
 * appears once something is actually filed under it; it just never appears
 * greyed, which `buildScanMenu` handles separately.
 */
const NAMED_PARTS: Part[] = PART_ORDER.filter((part) => part !== 'engine' && part !== 'other');

/**
 * What the scan menu offers, and what it has to explain.
 *
 * Every part is listed every time, including the ones this car cannot do. A
 * menu that hides what it cannot reach leaves the driver guessing whether the
 * app is limited or the car is; a greyed row carrying its reason answers that
 * without being asked.
 */
export function buildScanMenu(
  connected: boolean,
  addressing: CanAddressing | null,
  map: ModuleMap | null,
): ScanMenu {
  const modulesFor = (part: Part) => map?.modules.filter((entry) => entry.part === part) ?? [];

  // Order matters: no link outranks the protocol, because without a link the
  // protocol is not known either and blaming the car would be a guess.
  const partReason = (part: Part): Unavailable | null => {
    if (!connected) return 'no-link';
    if (!addressing) return 'not-can';
    return modulesFor(part).length > 0 ? null : 'not-found';
  };

  const parts: MenuRow[] = NAMED_PARTS.map((part) => ({
    part,
    label: PART_LABELS[part],
    modules: modulesFor(part),
    unavailable: partReason(part),
  }));

  // `other` earns a row only by having something in it, and then it is always
  // choosable -- there is no such thing as "go and look for an other module".
  const other = modulesFor('other');
  if (connected && addressing && other.length > 0) {
    parts.push({ part: 'other', label: PART_LABELS.other, modules: other, unavailable: null });
  }

  const engine: Unavailable | null = connected ? null : 'no-link';

  // Whole car means everything reachable, not everything listed, so a car that
  // reveals only an engine and a gearbox can still be scanned whole. It greys
  // out only when there is nothing to scan at all.
  const anythingReachable = engine === null || parts.some((row) => row.unavailable === null);

  return {
    engine: { unavailable: engine },
    parts,
    wholeCar: { unavailable: anythingReachable ? null : 'no-link' },
  };
}

/**
 * What a part's row says beneath its name: who is filed under it, and which of
 * them have gone quiet since.
 */
export function describeModules(modules: DiscoveredModule[]): string {
  return modules
    .map((module) => {
      const label = module.name ?? module.requestId;
      return module.stale ? `${label} — asleep since ${formatLastSeen(module.lastSeenAt)}` : label;
    })
    .join(', ');
}

/** The addresses a set of ticked parts means, for a `parts` scan. */
export function requestIdsForMenu(menu: ScanMenu, ticked: Set<Part>): string[] {
  return menu.parts
    .filter((row) => ticked.has(row.part) && row.unavailable === null)
    .flatMap((row) => row.modules.map((module) => module.requestId));
}
