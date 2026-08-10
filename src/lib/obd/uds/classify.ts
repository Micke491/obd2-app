import type { Part } from './parts';

/**
 * Places a discovered module without any brand knowledge.
 *
 * Nothing here is a lookup table of addresses. The first rule matches a name the
 * module supplied about itself, the second reads the letters of the codes it is
 * actually storing, and the third uses the only addresses the standard fixes.
 * A module that matches none of them stays "other" and is shown by its address,
 * for the same reason an unlisted trouble code says so rather than guessing.
 */

/** Matched against the module's own `22F197` answer. English and German both
 *  turn up in practice, often on the same car. */
const NAME_PATTERNS: Array<[RegExp, Part]> = [
  [/\b(ABS|ESP|ESC|DSC|DSTC|VSA|EBCM)\b|BREMS|BRAKE/i, 'brakes'],
  [/\b(SRS|RCM|ORC|ACU)\b|AIRBAG|RESTRAINT|RUECKHALT/i, 'restraints'],
  [/\b(EPS|EPAS|PSCM)\b|LENK|STEER/i, 'steering'],
  [/\b(TCM|TCU|DSG)\b|GETRIEBE|TRANSMISS|GEARBOX/i, 'transmission'],
  [/NIVEAU|LUFTFEDER|SUSPENS|DAMP|FAHRWERK/i, 'suspension'],
  [/\b(IPC|KOMBI)\b|CLUSTER|INSTRUMENT|TACHO/i, 'instruments'],
  [/GATEWAY|\bGW\b|DIAGNOSTIC BUS/i, 'network'],
  [/\b(BCM|CEM|SAM)\b|KAROSSERIE|BODY|COMFORT|KOMFORT|KLIMA|CLIMATE|HVAC/i, 'body'],
  [/\b(ECM|PCM|EDC|MED|SIMOS|DDE|DME)\b|ENGINE/i, 'engine'],
];

const CODE_LETTERS: Record<string, Part> = {
  P: 'engine',
  C: 'brakes',
  B: 'body',
  U: 'network',
};

/** The only addresses the standard fixes. 0x7E1 is the transmission by a
 *  convention near enough universal to rely on. */
const LEGISLATED: Record<string, Part> = {
  '7E0': 'engine',
  '7E1': 'transmission',
  '7E2': 'engine',
  '7E3': 'engine',
  '7E4': 'engine',
  '7E5': 'engine',
  '7E6': 'engine',
  '7E7': 'engine',
  '18DA00F1': 'engine',
  '18DA01F1': 'transmission',
};

export function classifyModule(input: {
  name: string | null;
  codes: string[];
  requestId: string;
}): Part {
  if (input.name) {
    for (const [pattern, part] of NAME_PATTERNS) {
      if (pattern.test(input.name)) return part;
    }
  }

  // A module stores codes in its own domain, so the first one is representative.
  const first = input.codes[0];
  if (first) {
    const part = CODE_LETTERS[first.charAt(0).toUpperCase()];
    if (part) return part;
  }

  return LEGISLATED[input.requestId.toUpperCase()] ?? 'other';
}
