import { sweepTargets, type CanAddressing } from '@/lib/obd/uds/addressing';

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

export function estimateSeconds(plan: ScanStep[]): number {
  const seconds = plan.reduce(
    (total, step) => total + (step.kind === 'discover' ? DISCOVER_SECONDS : INTERROGATE_SECONDS),
    0,
  );
  return Math.max(1, Math.round(seconds));
}
