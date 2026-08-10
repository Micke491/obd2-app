import { AUTHORED } from './authored';
import { DTC_CATALOG } from './catalog';
import { buildCatalogDraft, buildFamilyDraft } from './derive/families';
import { normaliseCode, parseCode } from './derive/parse';
import { findRule } from './derive/rules';
import type { DtcDetail } from './types';

/** Shown when the string is not a DTC at all — a typo in the search box. */
function unparseable(code: string): DtcDetail {
  return {
    code,
    title: 'Not a trouble code',
    meaning:
      'Trouble codes are a letter followed by four characters, like P0301 or U0100. The letter ' +
      'says which part of the car reported it: P for powertrain, C for chassis, B for body and ' +
      'U for the network between them.',
    severity: 'informational',
    drive: 'unknown',
    driveNote: 'Nothing to judge — this is not a code the car can report.',
    symptoms: [],
    causes: [],
    fixes: [],
    related: [],
    system: 'unknown',
    locus: null,
    confidence: 'family',
    manufacturerSpecific: false,
  };
}

/**
 * Resolves a code to a full explanation. Never returns null.
 *
 * Precedence, highest first:
 *   1. a hand-written entry
 *   2. a derive rule, with the SAE title substituted in if one exists
 *   3. a derive rule alone
 *   4. the SAE title plus its family paragraph
 *   5. the family paragraph alone
 *
 * Even the last tier is written prose. The whole point is that no code is ever
 * presented as a bare number.
 */
export function resolveDtcDetail(input: string): DtcDetail {
  const code = normaliseCode(input);
  const parsed = parseCode(code);
  if (!parsed) return unparseable(code);

  const manufacturerSpecific = !parsed.generic;
  const entry = DTC_CATALOG[code];

  const authored = AUTHORED[code];
  if (authored) {
    return {
      ...authored,
      code,
      locus: authored.locus ?? null,
      related: authored.related ?? [],
      confidence: 'authored',
      manufacturerSpecific,
    };
  }

  const rule = findRule(parsed);
  if (rule) {
    const draft = rule.build(parsed);
    return {
      ...draft,
      code,
      // The catalog carries the real SAE wording, which beats a generated title.
      title: entry?.title ?? draft.title,
      // A rule's meaning names the cylinder or sensor it worked out, so it is
      // kept; an urgency written for this one code still outranks the rule's.
      severity: entry?.risk?.severity ?? draft.severity,
      drive: entry?.risk?.drive ?? draft.drive,
      driveNote: entry?.risk?.note ?? draft.driveNote,
      confidence: entry ? 'catalog' : 'derived',
      manufacturerSpecific,
    };
  }

  if (entry) {
    return {
      ...buildCatalogDraft(parsed, entry),
      code,
      confidence: 'catalog',
      manufacturerSpecific,
    };
  }

  return {
    ...buildFamilyDraft(parsed),
    code,
    confidence: 'family',
    manufacturerSpecific,
  };
}
