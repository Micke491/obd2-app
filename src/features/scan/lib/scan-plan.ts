import { sweepTargets, type CanAddressing } from '@/lib/obd/uds/addressing';
import type { Part } from '@/lib/obd/uds/parts';

import type { DiscoveredModule } from './module-map';

/**
 * What the driver asked for.
 *
 * `parts` carries addresses rather than part names because a part is a grouping
 * of whatever modules were found, and two modules can share one. The screen
 * turns a ticked part back into its addresses before asking for a scan.
 */
export type ScanScope =
  | { kind: 'engine' }
  | { kind: 'whole' }
  | { kind: 'parts'; requestIds: string[] };

export type ScanStep = {
  /** `discover` asks whether anything is there; `interrogate` asks what it holds. */
  kind: 'discover' | 'interrogate';
  requestId: string;
  receiveFilter: string | null;
};

/**
 * Roughly what one step costs, for the estimate on the scope screen.
 *
 * A discovery step is `ATSH` plus one probe that usually goes unanswered, so it
 * costs the reply window. An interrogation is two or three real requests to a
 * module that is definitely listening.
 */
const DISCOVER_SECONDS = 0.16;
const INTERROGATE_SECONDS = 0.9;

export function buildScanPlan(scope: ScanScope, addressing: CanAddressing): ScanStep[] {
  if (scope.kind === 'engine') return [];

  const targets = sweepTargets(addressing);

  if (scope.kind === 'whole') {
    return targets.map((target) => ({ kind: 'discover' as const, ...target }));
  }

  // Only addresses this bus actually has. A stored map from another protocol,
  // or a value that has been edited, must not become a command.
  const known = new Map(targets.map((target) => [target.requestId, target]));

  return scope.requestIds
    .map((requestId) => known.get(requestId.toUpperCase()))
    .filter((target): target is NonNullable<typeof target> => target !== undefined)
    .map((target) => ({ kind: 'interrogate' as const, ...target }));
}

/**
 * The addresses a completed run can fairly be said to have asked, for
 * folding its result back into a map.
 *
 * Not `scope.requestIds` for a `parts` scan: a scan that stopped early --
 * `stop()`, or the adapter itself going quiet -- did not actually ask every
 * address the caller named, only the ones it reached before stopping, and
 * `visited` is exactly that. It already equals the caller's own target set
 * once a scan runs to completion, so this holds for every scope without
 * needing to special-case "did it finish" -- only `engine`, which never asks
 * a module at all, needs its own case.
 */
export function askedFromResult(scope: ScanScope, visited: string[]): string[] {
  return scope.kind === 'engine' ? [] : visited;
}

/**
 * Turns a ticked set of parts into the addresses a `parts` scan needs.
 *
 * This is the conversion `ScanScope`'s own comment above describes: a part is
 * a grouping of whatever modules were found, and two modules can share one, so
 * ticking "Brakes" can mean one address or several. The scope screen ticks
 * parts because that is what a driver recognises; `scan()` wants addresses
 * because that is all a re-read needs.
 */
export function requestIdsForParts(modules: DiscoveredModule[], parts: Set<Part>): string[] {
  return modules.filter((module) => parts.has(module.part)).map((module) => module.requestId);
}

export function estimateSeconds(plan: ScanStep[]): number {
  const seconds = plan.reduce(
    (total, step) => total + (step.kind === 'discover' ? DISCOVER_SECONDS : INTERROGATE_SECONDS),
    0,
  );
  return Math.max(1, Math.round(seconds));
}
