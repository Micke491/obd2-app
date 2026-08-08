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

/** Asks which protocol is actually in use, once the car has answered. */
export const PROTOCOL_QUERY = { cmd: 'ATDPN', timeoutMs: 3000 };

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
 * `ATST96` raises the adapter's reply deadline to ~600 ms (0x96 × 4.096 ms).
 * Adapters default to about 200 ms, and an ECU that takes longer — routine
 * during a K-line handshake, common on older CAN gateways — reads as NO DATA
 * on the very bus the car speaks. A workshop tool connects to those cars by
 * waiting longer; this is that wait. `ATAT1` still shortens it adaptively once
 * real replies show how fast the car actually is.
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
  { cmd: 'ATAT1', label: 'Enabling adaptive timing', timeoutMs: 3000 },
  { cmd: 'ATST96', label: 'Extending the reply window', timeoutMs: 3000 },
];

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
  timeoutMs: 22000,
};

/**
 * A second ask on whatever the adapter settled on, without disturbing it. A
 * search that ran past the first timeout often has the protocol by now, and one
 * more request is all it needs.
 */
export const ECU_HANDSHAKE_RETRY_MS = 10000;

/**
 * Probes that go completely unanswered before the protocol sweep is abandoned.
 *
 * A car that is not on the protocol being tried still replies — `NO DATA`, or a
 * bus error. Silence means the adapter itself has stopped listening, and
 * working through the remaining protocols would add a minute of waiting to a
 * question that has already been answered.
 */
export const SILENT_PROBES_BEFORE_GIVING_UP = 3;
