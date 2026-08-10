import type { StandardOptions } from 'react-native-bluetooth-classic';

/**
 * ELM327 ends every reply with a `>` prompt and separates lines with `\r`; it
 * never sends `\n`. The library defaults `delimiter` to `"\n"`, which would
 * make reads never complete, so splitting on the prompt is what pairs one read
 * event with one whole response.
 */
export const ELM327_CONNECTION_OPTIONS: StandardOptions = {
  connectorType: 'rfcomm',
  connectionType: 'delimited',
  delimiter: '>',
  charset: 'ascii',
  readTimeout: 0,
  secureSocket: true,
};

/**
 * Clone adapters commonly reject secure RFCOMM and need this fallback.
 *
 * The key matters: the Android side reads this option as `SECURE_SOCKET`,
 * `secure_socket` or `secure`, and silently defaults to a secure socket for
 * anything else — including the `secureSocket` the library's own TypeScript
 * types document. Sending only that name meant the fallback reconnected on
 * exactly the same kind of socket that had just been refused.
 */
export const ELM327_INSECURE_OPTIONS: StandardOptions = {
  ...ELM327_CONNECTION_OPTIONS,
  secureSocket: false,
  secure_socket: false,
} as StandardOptions & { secure_socket: boolean };

export const COMMAND_TERMINATOR = '\r';

export type InitStep = {
  cmd: string;
  label: string;
  timeoutMs: number;
  /** Quiet time to allow after the step, for an adapter still settling. */
  settleMs?: number;
};

/**
 * Re-arms protocol auto-detection. Kept separate because it is also what the
 * adapter is left holding when the app gives up, so the next attempt starts
 * from a clean search rather than from whichever bus was tried last.
 */
export const PROTOCOL_RESET: InitStep = {
  cmd: 'ATSP0',
  label: 'Selecting protocol',
  timeoutMs: 5000,
};

/** Choosing a protocol by name is a local setting, so it answers immediately. */
export const PROTOCOL_SELECT_TIMEOUT_MS = 3000;

/**
 * Closes whatever protocol is currently open, before another is selected.
 *
 * Selecting a protocol on top of a live one is not a clean test of the new one.
 * A K-line session carries on sending its wakeup messages, and a CAN controller
 * that dropped off the bus during a failed probe stays off it — reporting
 * `CAN ERROR` to everything that follows, including the protocols that have no
 * CAN in them at all. That is what a sweep looks like when it blames the car for
 * a wedged adapter: nine protocols tried, one answer given to all of them.
 */
export const PROTOCOL_CLOSE = { cmd: 'ATPC', timeoutMs: 2500 };

/**
 * Fixes the reply window at its full width, and puts it back under the
 * adapter's own control.
 *
 * Adaptive timing shortens the wait to match the replies it has actually seen,
 * which is right once a car is answering and wrong while still looking for one:
 * the CAN probes that fail in milliseconds teach it a deadline far too short for
 * the K-line ECU tried a few steps later, and that ECU then reads as NO DATA on
 * the very bus it speaks.
 */
export const FIXED_TIMING = { cmd: 'ATAT0', timeoutMs: 3000 };
export const ADAPTIVE_TIMING = { cmd: 'ATAT1', timeoutMs: 3000 };

/** Asks which protocol is actually in use, once the car has answered. */
export const PROTOCOL_QUERY = { cmd: 'ATDPN', timeoutMs: 3000 };

/**
 * Stops the adapter vetting the keyword bytes a K-line ECU answers its
 * initialisation with.
 *
 * On ISO 9141-2 and ISO 14230-4 the car replies to the wake-up with two keyword
 * bytes describing what it speaks, and the ELM327 checks them against the pair
 * the standard prescribes. A car whose bytes do not match is dropped with
 * `UNABLE TO CONNECT` — the same message it gives for a car that said nothing
 * at all, which is why the two are impossible to tell apart from outside.
 *
 * Plenty of cars answer with something else. The PSA group is the notorious
 * case and a Xsara Picasso is squarely in it: the ECU is talking, on the right
 * bus, at the right baud rate, and the adapter throws the session away over the
 * contents of two bytes it did not need to enforce. Turning the check off is
 * what a workshop tool does, and it costs a compliant car nothing.
 */
export const KEYWORD_CHECK_OFF = 'ATKW0';

/**
 * Adapter configuration. `ATE0` stops the command being echoed back into every
 * reply and `ATS0` removes the spaces between hex bytes; both simplify parsing
 * but the app tolerates either setting failing.
 *
 * `ATZ` is given quiet time afterwards because a reset adapter announces itself
 * on its own schedule, and a clone often sends its banner in more than one
 * piece. Letting that finish while nothing is waiting keeps the stray pieces
 * from being taken for answers to the commands that follow.
 *
 * `ATSTFF` opens the adapter's reply deadline to its widest, ~1.05 s
 * (0xFF × 4.096 ms). Adapters default to about 200 ms, and an ECU that takes
 * longer — routine during a K-line handshake, common on older CAN gateways —
 * reads as NO DATA on the very bus the car speaks. A workshop tool connects to
 * those cars by waiting longer; this is that wait. Opening it all the way costs
 * a fast car nothing, because `ATAT1` shortens it adaptively as soon as real
 * replies show how quick the car actually is.
 *
 * Protocol selection is deliberately not part of this list — it is the one step
 * that depends on what the car turned out to be, so the client appends it.
 */
export const ADAPTER_INIT_SEQUENCE: InitStep[] = [
  { cmd: 'ATZ', label: 'Resetting adapter', timeoutMs: 8000, settleMs: 600 },
  { cmd: 'ATE0', label: 'Disabling echo', timeoutMs: 3000 },
  { cmd: 'ATL0', label: 'Disabling linefeeds', timeoutMs: 3000 },
  { cmd: 'ATS0', label: 'Disabling spaces', timeoutMs: 3000 },
  { cmd: 'ATH0', label: 'Disabling headers', timeoutMs: 3000 },
  { cmd: KEYWORD_CHECK_OFF, label: 'Accepting non-standard ECUs', timeoutMs: 3000 },
  { cmd: 'ATAT1', label: 'Enabling adaptive timing', timeoutMs: 3000 },
  { cmd: 'ATSTFF', label: 'Extending the reply window', timeoutMs: 3000 },
];

/**
 * Init steps that have to answer before the rest are worth sending.
 *
 * Every ELM327 answers these, so a device that ignores all three is not one.
 * Finding that out after three commands rather than the whole sequence is what
 * keeps a paired speaker from costing half a minute on the way to the adapter
 * sitting behind it in the list.
 */
export const INIT_STEPS_THAT_MUST_ANSWER = 3;

/**
 * First real OBD query. Selecting a protocol only decides what the adapter will
 * speak; this is what makes it talk to the car, so it is the point at which the
 * vehicle is proven reachable.
 *
 * The timeout is long because auto-detection is allowed to walk the whole
 * protocol list, and the slow ones spend seconds on their initialisation
 * handshake before a single byte of data moves. Cutting the search short at
 * fifteen seconds and starting it over is not a retry — it is the same failure
 * three times, and it is why older non-CAN cars were unreachable.
 */
export const ECU_HANDSHAKE: InitStep = {
  cmd: '0100',
  label: 'Contacting ECU',
  timeoutMs: 20000,
};

/**
 * A second ask on whatever the adapter settled on, without disturbing it. A
 * search that ran past the first timeout often has the protocol by now, and one
 * more request is all it needs.
 */
export const ECU_HANDSHAKE_RETRY_MS = 8000;

/**
 * The search that follows a mid-sweep reset of the adapter.
 *
 * This is the step that reproduces, from inside the app, the one piece of
 * advice that fixes these cases in every forum thread: unplug the adapter, plug
 * it back in, try again. A chip that has been left confused by a run of failed
 * protocol changes cannot be talked round — only restarted — and a search begun
 * from a clean chip is a genuinely different attempt from the one that failed.
 */
export const ECU_RESTART_PROBE_MS = 10000;

/**
 * Probes that go completely unanswered before the protocol sweep is abandoned.
 *
 * A car that is not on the protocol being tried still replies — `NO DATA`, or a
 * bus error. Silence means the adapter itself has stopped listening, and
 * working through the remaining protocols would add a minute of waiting to a
 * question that has already been answered.
 */
export const SILENT_PROBES_BEFORE_GIVING_UP = 3;

/**
 * Resets the sweep may spend clearing a wedged controller, on top of the one
 * the plan already carries.
 *
 * `ATPC` is supposed to release the protocol between attempts, but on the clone
 * chips most people own it does not bring a CAN controller back from bus-off —
 * only a reset does. Without a fresh chip, the CAN protocols after the one that
 * wedged are never really tried: they are asked, and the dead controller
 * answers for them. Three is one per handover inside the CAN block, which is
 * where wedging happens; the planned restart covers the move to the older
 * buses, and past that a car has run out of protocols to be on.
 */
export const MAX_CONTROLLER_RESETS = 3;

/**
 * Consecutive failed commands before the link is treated as broken rather
 * than merely slow. Several in a row means the vehicle session was lost —
 * usually after a brownout that also erased the adapter's configuration.
 */
export const TROUBLE_THRESHOLD = 4;
