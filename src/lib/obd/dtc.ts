import { DTC_DESCRIPTIONS } from './dtc-descriptions';
import { extractPayload } from './protocol';

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
    description: DTC_DESCRIPTIONS[code] ?? null,
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

/**
 * Reads a stored/pending/permanent DTC list.
 *
 * CAN replies prefix the list with a code count while older ISO replies do not,
 * and a leading count byte is indistinguishable from the first byte of a code
 * by inspection alone. Both readings are computed and the count is only
 * accepted when it agrees with the number of codes that follow it.
 */
export function parseDtcList(hex: string, responseMode: string): Dtc[] {
  const payload = extractPayload(hex, responseMode);
  if (!payload || payload.length === 0) return [];

  const withoutCount = readPairs(payload);
  const count = payload[0];

  if (count >= 1 && count <= 15) {
    const withCount = readPairs(payload.slice(1));
    if (withCount.length === count) return withCount.map(describeDtc);
  }

  return withoutCount.map(describeDtc);
}
