import { PROTOCOL_NAMES, PROTOCOL_SWEEP } from '@/lib/obd/protocols';

import { ECU_HANDSHAKE, ECU_HANDSHAKE_RETRY_MS, ECU_RESTART_PROBE_MS } from './at-commands';

/** One protocol's turn at reaching the car. */
export type HandshakeStep = {
  label: string;
  /** Protocol to select first, or null to use whatever is already armed. */
  select: string | null;
  timeoutMs: number;
  /** How many `0100`s to send before ruling this step out. */
  attempts: number;
  /**
   * Whether a run of completely unanswered probes should abandon the rest of
   * the plan. False for the opening attempts, where silence means only that
   * auto-detection was still searching when the app stopped waiting.
   */
  abandonable: boolean;
  /**
   * Reset the adapter and configure it again before this step runs. Everything
   * the previous steps left behind goes with it, which is the point.
   */
  restart: boolean;
};

/**
 * The order in which to try to reach the car.
 *
 * Auto-detection twice, then every protocol by name, with the adapter restarted
 * once part-way through. The two openers matter as much as the sweep: an ELM327
 * asked to find the protocol itself will happily still be searching when the
 * first request times out, and asking again without disturbing it is what lets
 * that search finish. Re-arming the search between attempts — which is what this
 * used to do — throws the progress away and turns a retry into a repeat of the
 * same failure.
 *
 * The restart sits where the CAN protocols give way to the older buses, because
 * that is the boundary a confused adapter hides behind: a chip whose CAN
 * controller has dropped off the bus answers `CAN ERROR` to every protocol after
 * it, K-line and J1850 included, and the sweep ends up reporting a car that
 * "never answered on any protocol" when nothing after the first failure was
 * genuinely tried.
 */
export function buildHandshakePlan(known: string | null): HandshakeStep[] {
  const plan: HandshakeStep[] = [
    {
      label: known ? `Contacting ECU on ${PROTOCOL_NAMES[known] ?? 'the known protocol'}` : ECU_HANDSHAKE.label,
      select: null,
      timeoutMs: ECU_HANDSHAKE.timeoutMs,
      attempts: 1,
      abandonable: false,
      restart: false,
    },
    {
      label: 'Contacting ECU again',
      select: null,
      timeoutMs: ECU_HANDSHAKE_RETRY_MS,
      attempts: 1,
      abandonable: false,
      restart: false,
    },
  ];

  let restarted = false;

  for (const protocol of PROTOCOL_SWEEP) {
    // Whatever was already armed has just had two goes of its own; naming it a
    // third time would only add to the wait.
    if (protocol.id === known) continue;

    if (!restarted && protocol.bus !== 'CAN') {
      restarted = true;
      plan.push({
        label: 'Restarting the adapter, then searching again',
        select: null,
        timeoutMs: ECU_RESTART_PROBE_MS,
        attempts: 1,
        abandonable: true,
        restart: true,
      });
    }

    plan.push({
      label: `Trying ${protocol.name}`,
      select: protocol.id,
      timeoutMs: protocol.probeTimeoutMs,
      attempts: protocol.attempts,
      abandonable: true,
      restart: false,
    });
  }

  return plan;
}

/** Longest a plan can take when nothing answers. Kept honest by the checks. */
export function worstCaseDuration(plan: HandshakeStep[]): number {
  return plan.reduce((total, step) => total + step.timeoutMs * step.attempts, 0);
}
