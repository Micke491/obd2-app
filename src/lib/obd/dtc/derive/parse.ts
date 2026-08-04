export type CodeLetter = 'P' | 'C' | 'B' | 'U';

export type ParsedCode = {
  raw: string;
  letter: CodeLetter;
  /** Second character: 0 and 2 are SAE-defined, 1 and 3 are manufacturer. */
  typeDigit: number;
  /** Third character: the subsystem group. */
  systemDigit: number;
  /** The last two characters as a number, 0–255. */
  ordinal: number;
  /**
   * The four characters after the letter read as one hex number.
   *
   * DTC digits are hexadecimal — P242F is a real code — so every range bound in
   * the rule table is written in hex space. Treating them as decimal silently
   * mis-sorts everything above xxA0.
   */
  numeric: number;
  generic: boolean;
};

const LETTERS: CodeLetter[] = ['P', 'C', 'B', 'U'];
const CODE_PATTERN = /^[PCBU][0-3][0-9A-F]{3}$/;

export function normaliseCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '');
}

export function parseCode(input: string): ParsedCode | null {
  const raw = normaliseCode(input);
  if (!CODE_PATTERN.test(raw)) return null;

  const letter = raw.charAt(0) as CodeLetter;
  if (!LETTERS.includes(letter)) return null;

  const typeDigit = Number.parseInt(raw.charAt(1), 16);
  const systemDigit = Number.parseInt(raw.charAt(2), 16);
  const ordinal = Number.parseInt(raw.slice(3), 16);
  const numeric = Number.parseInt(raw.slice(1), 16);

  return {
    raw,
    letter,
    typeDigit,
    systemDigit,
    ordinal,
    numeric,
    generic: typeDigit === 0 || typeDigit === 2,
  };
}

export function isValidCode(input: string): boolean {
  return parseCode(input) !== null;
}
