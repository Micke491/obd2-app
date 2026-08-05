import { DTC_CATALOG } from './catalog';
import { extractPayload, hexToBytes } from '../protocol';

export type DtcCategory = 'powertrain' | 'chassis' | 'body' | 'network';

export type Dtc = {
  code: string;
  category: DtcCategory;
  /** Null when the code is outside the curated set, rather than a guess. */
  description: string | null;
  /** Generic codes are SAE-defined; manufacturer codes vary by brand. */
  manufacturerSpecific: boolean;
};

const SYSTEM_LETTERS = ['P', 'C', 'B', 'U'] as const;
const CATEGORIES: Record<string, DtcCategory> = {
  P: 'powertrain',
  C: 'chassis',
  B: 'body',
  U: 'network',
};

/**
 * Unpacks the two-byte on-wire form.
 *
 * The top two bits select the system letter and the next two the first digit,
 * so 0x03 0x01 is P0301: system 0 (P), digit 0, then 3, 0, 1 as nibbles.
 * A pair of zero bytes is padding, not a code.
 */
export function decodeDtcBytes(a: number, b: number): string | null {
  if (a === 0 && b === 0) return null;

  const letter = SYSTEM_LETTERS[(a >> 6) & 0x03];
  const firstDigit = (a >> 4) & 0x03;
  const rest = [(a & 0x0f), (b >> 4) & 0x0f, b & 0x0f]
    .map((nibble) => nibble.toString(16).toUpperCase())
    .join('');

  return `${letter}${firstDigit}${rest}`;
}

export function describeDtc(code: string): Dtc {
  const letter = code.charAt(0);
  const secondDigit = code.charAt(1);

  return {
    code,
    category: CATEGORIES[letter] ?? 'powertrain',
    description: DTC_CATALOG[code] ?? null,
    // Second digit 1 or 2 marks a manufacturer-defined code in the SAE scheme.
    manufacturerSpecific: secondDigit === '1' || secondDigit === '2',
  };
}

function readPairs(bytes: number[]): string[] {
  const codes: string[] = [];
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const code = decodeDtcBytes(bytes[i], bytes[i + 1]);
    if (code) codes.push(code);
  }
  return codes;
}

/** Mode NN+0x40 -> the request that produced it, e.g. `43` -> `03`. */
function requestModeFor(responseMode: string): string {
  return (Number.parseInt(responseMode, 16) - 0x40).toString(16).toUpperCase().padStart(2, '0');
}

/**
 * The code bytes of one control unit's answer, or null when the frame is not
 * one — the surviving echo of the request, or another mode's reply.
 */
function frameBody(frame: string, responseMode: string): number[] | null {
  const echo = requestModeFor(responseMode);
  const body = frame.startsWith(echo + responseMode) ? frame.slice(echo.length) : frame;

  if (!body.startsWith(responseMode)) return null;
  return hexToBytes(body.slice(responseMode.length));
}

/**
 * Reads one control unit's list.
 *
 * CAN replies prefix the list with a code count while older ISO replies do not,
 * and a leading count byte is indistinguishable from the first byte of a code
 * by inspection alone. Both readings are computed and the count is only
 * accepted when it agrees with the number of codes that follow it.
 */
function readList(payload: number[]): string[] {
  const withoutCount = readPairs(payload);
  const count = payload[0];

  if (count >= 1 && count <= 15) {
    const withCount = readPairs(payload.slice(1));
    if (withCount.length === count) return withCount;
  }

  return withoutCount;
}

/**
 * Reads a stored/pending/permanent DTC list from every control unit that
 * answered.
 *
 * Each unit replies for itself, and with headers switched off the only thing
 * separating one unit's answer from the next is the line break. Reading them as
 * one list invents faults: an engine and a transmission controller that both
 * report nothing send `4300` and `4300`, which concatenated to `43004300` and
 * decoded as a single list yields the fault `P0043` on a car whose warning light
 * is off. Each frame is therefore read on its own and the results merged.
 */
export function parseDtcList(frames: string[], responseMode: string): Dtc[] {
  const bodies = frames
    .map((frame) => frameBody(frame, responseMode))
    .filter((body): body is number[] => body !== null && body.length > 0);

  if (bodies.length === 0) {
    // Nothing opened with the response mode. Fall back to searching the whole
    // reply so an adapter whose framing we did not anticipate still reports.
    const payload = extractPayload(frames.join(''), responseMode);
    if (!payload || payload.length === 0) return [];
    bodies.push(payload);
  }

  const seen = new Set<string>();
  const codes: string[] = [];

  for (const body of bodies) {
    for (const code of readList(body)) {
      // Two units can hold the same fault; it is one fault to the driver.
      if (seen.has(code)) continue;
      seen.add(code);
      codes.push(code);
    }
  }

  return codes.map(describeDtc);
}
