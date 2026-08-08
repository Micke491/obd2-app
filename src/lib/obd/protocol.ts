/**
 * Adapter-level failures. A response containing one of these carries no data.
 *
 * The list has to be complete, because anything missing from it is not merely
 * unrecognised — `parseResponse` strips the non-hex characters out of whatever
 * it does not recognise and reads the remainder as payload. `BUS INIT: ERROR`
 * reduced to the byte `E`, `BUFFER FULL` to `BFFEF`. Both were then reported as
 * successful answers from a healthy link, so a car that had told the app
 * exactly what was wrong looked no different from one that never replied.
 */
/**
 * The three failures that are the adapter's own, not the car's.
 *
 * `CAN ERROR` is the chip saying it transmitted and no other node acknowledged
 * it, which leaves its controller off the bus; `BUS ERROR` is the same story on
 * the older wiring; `LV RESET` is the chip having rebooted and lost the
 * configuration it was given. Named here because the connection sweep has to
 * recognise them — see `indicatesControllerFault`.
 */
const CAN_BUS_ERROR = 'CAN bus error';
const BUS_ERROR = 'Bus error';
const ADAPTER_BROWNOUT = 'Adapter browned out';

const ERROR_PHRASES: Array<[RegExp, string | ((match: RegExpExecArray) => string)]> = [
  [/UNABLE\s*TO\s*CONNECT/, 'Adapter could not reach the ECU'],
  // The K-line protocols announce their initialisation handshake and its
  // outcome. `BUS INIT: OK` precedes real data; the error form is how an older
  // non-CAN car reports that it never came up.
  [/BUS\s*INIT[\s.:]*ERROR/, 'The car did not answer the adapter'],
  [/CAN\s*ERROR/, CAN_BUS_ERROR],
  [/BUS\s*ERROR/, BUS_ERROR],
  [/(?:RX|TX)\s*ERROR/, 'Garbled reply'],
  [/DATA\s*ERROR/, 'Data error'],
  [/FB\s*ERROR/, 'Feedback error'],
  [/BUS\s*BUSY/, 'Bus busy'],
  [/BUFFER\s*FULL/, 'Reply too long for the adapter'],
  [/LV\s*RESET/, ADAPTER_BROWNOUT],
  [/LP\s*ALERT/, 'Adapter going to sleep'],
  [/ACT\s*ALERT/, 'Adapter idle'],
  [/STOPPED/, 'Request stopped'],
  [/NO\s*DATA/, 'No data'],
  // The adapter's own faults, reported as a two-digit code. No hex payload can
  // contain the letter R, so this cannot swallow real data.
  [/\bERR\d{2}\b/, (match) => `Adapter internal error ${match[0]}`],
  [/^\s*\?\s*$/, 'Adapter did not understand the command'],
];

/** Emitted during protocol negotiation. Progress, not failure. */
const TRANSIENT_PHRASES = [/SEARCHING\.*/g, /BUS\s*INIT\.*/g, /\bOK\b/g];

/**
 * A refusal from the vehicle rather than the adapter, carried as `7F <mode>
 * <code>`. Without this the three bytes read as ordinary data, which made a
 * refused request look like an empty-but-successful answer.
 */
const NEGATIVE_RESPONSE_CODES: Record<string, string> = {
  '10': 'The car rejected the request',
  '11': 'The car does not support this service',
  '12': 'The car does not support this request',
  '13': 'The car rejected the request as malformed',
  '21': 'The car is busy',
  '22': 'The car cannot answer this right now',
  '31': 'The car does not have that value',
  '78': 'The car did not finish answering in time',
};

export type ObdResponse =
  | {
      ok: true;
      /** Every payload frame concatenated. Correct for a single responder. */
      hex: string;
      /**
       * One entry per responding control unit. Headers are off, so this is the
       * only thing separating two ECUs answering the same question.
       */
      frames: string[];
      declaredBytes: number | null;
    }
  | { ok: false; reason: string };

/** Upper-cases and reduces the adapter's `\r` line breaks to one form. */
export function normalizeReply(raw: string): string {
  return raw.replace(/[\r\n]+/g, '\n').toUpperCase();
}

const CONTROLLER_FAULTS: ReadonlySet<string> = new Set([CAN_BUS_ERROR, BUS_ERROR, ADAPTER_BROWNOUT]);

/**
 * Whether a failure means the adapter itself has stopped being able to talk.
 *
 * The distinction decides what to do next, and getting it wrong is expensive
 * both ways. A controller that has dropped off the bus answers every protocol
 * tried after it with the same error — including the ones with no CAN in them —
 * so carrying on down the list tests nothing and ends by blaming the car for a
 * fault that belongs to the chip. Treating an ordinary `NO DATA` as one of
 * these would be the opposite mistake: a reset costs a full reconfiguration,
 * and spending one on a sweep that is working adds that to every step left.
 */
export function indicatesControllerFault(reason: string): boolean {
  return CONTROLLER_FAULTS.has(reason);
}

/** The adapter-level failure a reply reports, or null when it carries data. */
export function matchedErrorPhrase(text: string): string | null {
  for (const [pattern, reason] of ERROR_PHRASES) {
    const match = pattern.exec(text);
    if (match) return typeof reason === 'string' ? reason : reason(match);
  }
  return null;
}

/** Removes negotiation chatter that would otherwise be read as hex digits. */
export function stripTransientPhrases(text: string): string {
  let cleaned = text;
  for (const pattern of TRANSIENT_PHRASES) cleaned = cleaned.replace(pattern, ' ');
  return cleaned;
}

export function isNegativeResponse(frame: string): boolean {
  return frame.startsWith('7F') && frame.length >= 6;
}

export function describeNegativeResponse(frame: string): string {
  return NEGATIVE_RESPONSE_CODES[frame.slice(4, 6)] ?? 'The car refused the request';
}

/**
 * Turns a raw adapter reply into hex payload frames.
 *
 * Error phrases are matched on the text and returned as failures rather than
 * filtered out, because stripping non-hex characters from them would inject
 * digits into the payload: `NO DATA` reduces to `DAA`, `SEARCHING` to `EAC`.
 */
export function parseResponse(raw: string): ObdResponse {
  const text = normalizeReply(raw);

  const failure = matchedErrorPhrase(text);
  if (failure) return { ok: false, reason: failure };

  const { frames, declaredBytes } = groupFrames(stripTransientPhrases(text));
  const carrying = frames.filter((frame) => !isNegativeResponse(frame));

  if (carrying.length === 0) {
    const refusal = frames.find(isNegativeResponse);
    return { ok: false, reason: refusal ? describeNegativeResponse(refusal) : 'Empty response' };
  }

  return { ok: true, hex: carrying.join(''), frames: carrying, declaredBytes };
}

/**
 * Splits a reply into one hex string per responding control unit.
 *
 * Two things arrive interleaved on the same wire. A long answer from one ECU is
 * sent as an ISO-TP group — a byte-count header followed by sequenced lines,
 * which must be stripped of their `N:` prefixes and rejoined:
 *
 *   014          <- total payload bytes, hex
 *   0:490201314434
 *   1:47503030523535
 *
 * Short answers from several ECUs arrive as one plain line each, and with
 * headers off nothing distinguishes them but the line break. Concatenating
 * those was what let two control units each reporting "no faults" (`4300` and
 * `4300`) decode as the single fault `P0043`, so they are kept apart here.
 */
export function groupFrames(text: string): { frames: string[]; declaredBytes: number | null } {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  let declaredBytes: number | null = null;
  const frames: string[] = [];
  let group: string[] | null = null;

  const closeGroup = () => {
    if (!group) return;
    const hex = sanitizeHex(group.join(''));
    if (hex) frames.push(hex);
    group = null;
  };

  for (const line of lines) {
    if (/^[0-9A-F]{3}$/.test(line)) {
      // A byte count opens a new multi-frame answer.
      closeGroup();
      declaredBytes = Number.parseInt(line, 16);
      group = [];
      continue;
    }

    const sequenced = line.match(/^[0-9A-F]:\s*(.*)$/);
    if (sequenced) {
      if (!group) group = [];
      group.push(sequenced[1]);
      continue;
    }

    closeGroup();
    const hex = sanitizeHex(line);
    if (hex) frames.push(hex);
  }

  closeGroup();

  return { frames, declaredBytes };
}

function sanitizeHex(text: string): string {
  return text.replace(/[^0-9A-F]/g, '');
}

export function hexToBytes(hex: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i + 1 < hex.length; i += 2) {
    const byte = Number.parseInt(hex.slice(i, i + 2), 16);
    if (Number.isNaN(byte)) return bytes;
    bytes.push(byte);
  }
  return bytes;
}

/**
 * Finds a `<mode+0x40><pid>` marker at a byte boundary and returns what follows.
 *
 * Searching for the marker rather than reading a fixed offset tolerates a
 * surviving command echo and multi-ECU replies, where frames are concatenated
 * and the first match is the one to use. Only even offsets are considered: hex
 * is two characters per byte, so a match starting mid-byte is a coincidence
 * between two neighbouring values, not a header.
 */
export function markerOffset(hex: string, marker: string): number {
  for (let at = hex.indexOf(marker); at !== -1; at = hex.indexOf(marker, at + 1)) {
    if (at % 2 === 0) return at;
  }
  return -1;
}

export function extractPayload(hex: string, responseMode: string, pid?: string): number[] | null {
  const marker = responseMode + (pid ?? '');
  const start = markerOffset(hex, marker);
  if (start === -1) return null;
  return hexToBytes(hex.slice(start + marker.length));
}

/** Mode NN -> its positive response prefix, e.g. `01` -> `41`. */
export function responseModeFor(mode: string): string {
  return (Number.parseInt(mode, 16) + 0x40).toString(16).toUpperCase().padStart(2, '0');
}
