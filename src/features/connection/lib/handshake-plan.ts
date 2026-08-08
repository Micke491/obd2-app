import { PROTOCOL_NAMES, PROTOCOL_SWEEP } from '@/lib/obd/protocols';

import { ECU_HANDSHAKE, ECU_HANDSHAKE_RETRY_MS } from './at-commands';

/** One `0100`, and what to arm the adapter with before sending it. */
export type HandshakeStep = {
  label: string;
  /** Protocol to select first, or null to use whatever is already armed. */
  select: string | null;
  timeoutMs: number;
  /**
   * Whether a run of completely unanswered probes should abandon the rest of
   * the plan. False for the opening attempts, where silence means only that
   * auto-detection was still searching when the app stopped waiting.
   */
  abandonable: boolean;
};

/**
 * The order in which to try to reach the car.
 *
 * Auto-detection twice, then every protocol by name. The two openers matter as
 * much as the sweep: an ELM327 asked to find the protocol itself will happily
 * still be searching when the first request times out, and asking again without
 * disturbing it is what lets that search finish. Re-arming the search between
 * attempts — which is what this used to do — throws the progress away and turns
 * a retry into a repeat of the same failure.
 */
export function buildHandshakePlan(known: string | null): HandshakeStep[] {
  const plan: HandshakeStep[] = [
    {
      label: known ? `Contacting ECU on ${PROTOCOL_NAMES[known] ?? 'the known protocol'}` : ECU_HANDSHAKE.label,
      select: null,
      timeoutMs: ECU_HANDSHAKE.timeoutMs,
      abandonable: false,
    },
    {
      label: 'Contacting ECU again',
      select: null,
      timeoutMs: ECU_HANDSHAKE_RETRY_MS,
      abandonable: false,
    },
  ];

  for (const protocol of PROTOCOL_SWEEP) {
    // Whatever was already armed has just had two goes of its own; naming it a
    // third time would only add to the wait.
    if (protocol.id === known) continue;

    plan.push({
      label: `Trying ${protocol.name}`,
      select: protocol.id,
      timeoutMs: protocol.probeTimeoutMs,
      abandonable: true,
    });
  }

  return plan;
}

/** Longest a plan can take when nothing answers. Kept honest by the checks. */
export function worstCaseDuration(plan: HandshakeStep[]): number {
  return plan.reduce((total, step) => total + step.timeoutMs, 0);
}
