import {
  groupFrames,
  hexToBytes,
  matchedErrorPhrase,
  normalizeReply,
  stripTransientPhrases,
} from '../protocol';

/**
 * Reading a module the app has never heard of.
 *
 * `parseResponse` is not used here on purpose. It folds every negative response
 * into `{ ok: false, reason: … }`, and a negative response is the single most
 * useful thing a sweep can hear: `7F 19 11` means a module is present and speaks
 * KWP rather than UDS. Discarding the NRC byte would turn the best signal into a
 * failure indistinguishable from silence.
 */

/** Status mask meaning "any fault". A few ECUs refuse it and want 0x08. */
export const DTC_STATUS_MASK = 'AF';
export const DTC_STATUS_MASK_FALLBACK = '08';

export const SYSTEM_NAME_REQUEST = '22F197';
export const KWP_DTC_REQUEST = '1800FF00';

export const dtcCountRequest = (mask: string = DTC_STATUS_MASK) => `1901${mask}`;
export const dtcListRequest = (mask: string = DTC_STATUS_MASK) => `1902${mask}`;

export type UdsReply =
  | { kind: 'positive'; body: number[] }
  | { kind: 'negative'; nrc: number }
  /** Nothing is at that address. */
  | { kind: 'silent' }
  /** The adapter's own trouble, or an answer to a different question. */
  | { kind: 'unusable'; reason: string };

const SILENT_REASONS = new Set(['No data', 'Empty response']);

export function parseUdsReply(raw: string, service: number): UdsReply {
  const text = normalizeReply(raw).trim();
  if (!text) return { kind: 'silent' };

  const failure = matchedErrorPhrase(text);
  if (failure) {
    return SILENT_REASONS.has(failure) ? { kind: 'silent' } : { kind: 'unusable', reason: failure };
  }

  const { frames } = groupFrames(stripTransientPhrases(text));
  const positive = (service + 0x40).toString(16).toUpperCase().padStart(2, '0');
  const negative = service.toString(16).toUpperCase().padStart(2, '0');

  for (const frame of frames) {
    if (frame.startsWith(positive)) {
      return { kind: 'positive', body: hexToBytes(frame.slice(2)) };
    }
    // 7F <service> <nrc>. The service byte has to match, or this is an answer
    // to a different command that arrived in the wrong order.
    if (frame.startsWith('7F') && frame.length >= 6) {
      if (frame.slice(2, 4) !== negative) continue;
      return { kind: 'negative', nrc: Number.parseInt(frame.slice(4, 6), 16) };
    }
  }

  return frames.length === 0
    ? { kind: 'silent' }
    : { kind: 'unusable', reason: 'A reply to a different request' };
}

export type NrcAction = 'kwp-fallback' | 'retry-mask' | 'pending' | 'present-unreadable';

export function nrcAction(nrc: number): NrcAction {
  if (nrc === 0x11) return 'kwp-fallback';
  if (nrc === 0x12 || nrc === 0x13 || nrc === 0x31) return 'retry-mask';
  if (nrc === 0x78) return 'pending';
  return 'present-unreadable';
}

/** `19 01` body: sub-function, availability mask, format, then a 16-bit count. */
export function parseDtcCount(body: number[]): number | null {
  if (body.length < 5) return null;
  return (body[3] << 8) | body[4];
}

/** `19 02` body: sub-function, availability mask, then four bytes per fault. */
export function parseDtcGroups(body: number[]): number[][] {
  return chunk(body.slice(2), 4);
}

/** `18` body: a count byte, then three bytes per fault. */
export function parseKwpGroups(body: number[]): number[][] {
  return chunk(body.slice(1), 3);
}

/** `22 F197` body: the two DID bytes, then the name in ASCII. */
export function parseSystemName(body: number[]): string | null {
  const text = body
    .slice(2)
    .filter((byte) => byte >= 0x20 && byte <= 0x7e)
    .map((byte) => String.fromCharCode(byte))
    .join('')
    .trim();

  return text.length > 0 ? text : null;
}

function chunk(bytes: number[], size: number): number[][] {
  const groups: number[][] = [];
  for (let at = 0; at + size <= bytes.length; at += size) {
    groups.push(bytes.slice(at, at + size));
  }
  return groups;
}
