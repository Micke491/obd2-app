import type { StandardOptions } from 'react-native-bluetooth-classic';

/**
 * ELM327 terminates every response with a `>` prompt character, and separates
 * lines with `\r`. It never sends `\n`.
 *
 * react-native-bluetooth-classic defaults `delimiter` to `"\n"`
 * (StandardOption.java:43), so leaving it alone means no read ever completes and
 * the app hangs with no error. Splitting on `>` instead makes each read event
 * exactly one complete adapter response, which is what lets `sendCommand` pair a
 * request with its reply.
 */
export const ELM327_CONNECTION_OPTIONS: StandardOptions = {
  connectorType: 'rfcomm',
  connectionType: 'delimited',
  delimiter: '>',
  charset: 'ascii',
  readTimeout: 0,
  secureSocket: true,
};

/** Retry shape for clone adapters that reject secure RFCOMM sockets. */
export const ELM327_INSECURE_OPTIONS: StandardOptions = {
  ...ELM327_CONNECTION_OPTIONS,
  secureSocket: false,
};

/** Commands are terminated with a carriage return, never a newline. */
export const COMMAND_TERMINATOR = '\r';

export type InitStep = {
  cmd: string;
  label: string;
  timeoutMs: number;
  /**
   * When false, a failure is logged and the handshake continues. Most `AT`
   * configuration commands are cosmetic — losing echo-suppression makes parsing
   * messier but not impossible, so refusing to connect over one would be wrong.
   */
  required: boolean;
};

/**
 * Handshake, in order. Each step waits for the adapter's reply before the next
 * is written.
 */
export const INIT_SEQUENCE: InitStep[] = [
  {
    cmd: 'ATZ',
    label: 'Resetting adapter',
    // A full reset reboots the ELM327 and replays its firmware banner.
    timeoutMs: 8000,
    required: false,
  },
  {
    cmd: 'ATE0',
    label: 'Disabling echo',
    timeoutMs: 3000,
    required: false,
  },
  {
    cmd: 'ATL0',
    label: 'Disabling linefeeds',
    timeoutMs: 3000,
    required: false,
  },
  {
    cmd: 'ATS0',
    // Spaces off yields `410C1AF8` rather than `41 0C 1A F8`.
    label: 'Disabling spaces',
    timeoutMs: 3000,
    required: false,
  },
  {
    cmd: 'ATH0',
    label: 'Disabling headers',
    timeoutMs: 3000,
    required: false,
  },
  {
    cmd: 'ATSP0',
    label: 'Selecting protocol',
    timeoutMs: 5000,
    required: false,
  },
  {
    cmd: '0100',
    label: 'Contacting ECU',
    /**
     * The only required step. `ATSP0` merely arms auto-detection; this first
     * real OBD query is what forces the adapter to negotiate a protocol with the
     * vehicle, so it is the earliest point at which "the car is actually
     * responding" can be established. Negotiation across all protocols is slow.
     */
    timeoutMs: 15000,
    required: true,
  },
];

/**
 * Status text the adapter emits that is not an error.
 *
 * `SEARCHING...` and `BUS INIT` appear mid-negotiation and are routinely
 * mistaken for failures — treating them as such is a common cause of a false
 * "connection failed" on a car that was about to answer.
 */
export const TRANSIENT_RESPONSES = ['SEARCHING', 'BUS INIT', 'BUSINIT'] as const;

/** Adapter-level failures. */
export const ERROR_RESPONSES = [
  'UNABLE TO CONNECT',
  'CAN ERROR',
  'BUS ERROR',
  'DATA ERROR',
  'BUS BUSY',
  'FB ERROR',
  'LV RESET',
  'STOPPED',
] as const;
