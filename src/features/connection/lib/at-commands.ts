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

/** Clone adapters commonly reject secure RFCOMM and need this fallback. */
export const ELM327_INSECURE_OPTIONS: StandardOptions = {
  ...ELM327_CONNECTION_OPTIONS,
  secureSocket: false,
};

export const COMMAND_TERMINATOR = '\r';

export type InitStep = {
  cmd: string;
  label: string;
  timeoutMs: number;
  /** Quiet time to allow after the step, for an adapter still settling. */
  settleMs?: number;
};

/**
 * Re-arms protocol auto-detection. Kept separate because it is also the thing
 * worth repeating when the first attempt to reach the vehicle fails.
 */
export const PROTOCOL_RESET: InitStep = {
  cmd: 'ATSP0',
  label: 'Selecting protocol',
  timeoutMs: 5000,
};

/**
 * Adapter configuration. `ATE0` stops the command being echoed back into every
 * reply and `ATS0` removes the spaces between hex bytes; both simplify parsing
 * but the app tolerates either setting failing.
 *
 * `ATZ` is given quiet time afterwards because a reset adapter announces itself
 * on its own schedule, and a clone often sends its banner in more than one
 * piece. Letting that finish while nothing is waiting keeps the stray pieces
 * from being taken for answers to the commands that follow.
 */
export const ADAPTER_INIT_SEQUENCE: InitStep[] = [
  { cmd: 'ATZ', label: 'Resetting adapter', timeoutMs: 8000, settleMs: 600 },
  { cmd: 'ATE0', label: 'Disabling echo', timeoutMs: 3000 },
  { cmd: 'ATL0', label: 'Disabling linefeeds', timeoutMs: 3000 },
  { cmd: 'ATS0', label: 'Disabling spaces', timeoutMs: 3000 },
  { cmd: 'ATH0', label: 'Disabling headers', timeoutMs: 3000 },
  { cmd: 'ATAT1', label: 'Enabling adaptive timing', timeoutMs: 3000 },
  PROTOCOL_RESET,
];

/**
 * First real OBD query. `ATSP0` only arms auto-detection; this is what forces
 * the adapter to negotiate with the vehicle, so it is the point at which the
 * ECU is proven reachable. Searching every protocol is slow.
 */
export const ECU_HANDSHAKE: InitStep = {
  cmd: '0100',
  label: 'Contacting ECU',
  timeoutMs: 15000,
};

/**
 * Auto-detection frequently gives up on its first pass with a clone adapter and
 * succeeds on the next, so a single failure is not yet evidence the car is
 * unreachable.
 */
export const ECU_HANDSHAKE_ATTEMPTS = 3;
