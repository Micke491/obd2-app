import {
  groupFrames,
  markerOffset,
  matchedErrorPhrase,
  normalizeReply,
  responseModeFor,
  stripTransientPhrases,
} from './protocol';

/**
 * Decides whether a reply answers the command that is waiting for it.
 *
 * The protocol carries no request ids, so a reply is paired with a command
 * purely by arrival order. That works until the adapter emits one message more
 * than it was asked for — a late answer arriving after the app gave up, a spare
 * prompt after `ATZ` or a protocol search, or a second control unit's frame
 * landing after the prompt. Every later reply then answers the previous
 * command, and because a wrong-but-well-formed reply raises no error and never
 * times out, the mismatch is permanent: values freeze at their last reading and
 * nothing recovers short of restarting the app.
 *
 * Checking the reply against the command turns that permanent break into a
 * single discarded message.
 */

/** Modes whose positive reply repeats the requested PID or test id back. */
const ECHOES_REQUEST_BYTE = new Set(['01', '02', '05', '06', '08', '09']);

export function normalizeCommand(cmd: string): string {
  return cmd.replace(/\s/g, '').toUpperCase();
}

export function isAtCommand(cmd: string): boolean {
  return normalizeCommand(cmd).startsWith('AT');
}

/**
 * The hex a positive answer to `cmd` has to open with, or null when the command
 * is not an OBD request. Mode 01 PID 0C expects `410C`; mode 03 expects only
 * `43`, because a stored-code list does not echo anything back.
 */
export function expectedReplyPrefix(cmd: string): string | null {
  const compact = normalizeCommand(cmd);
  if (!/^[0-9A-F]{2,}$/.test(compact)) return null;

  const mode = compact.slice(0, 2);
  const prefix = responseModeFor(mode);

  if (ECHOES_REQUEST_BYTE.has(mode) && compact.length >= 4) {
    return prefix + compact.slice(2, 4);
  }
  return prefix;
}

export function acceptsReply(cmd: string, raw: string): boolean {
  const text = normalizeReply(raw).trim();

  // A bare prompt. Never an answer, and the single most common way the adapter
  // hands out one more message than it was asked for.
  if (!text) return false;

  // AT commands answer in prose — `OK`, `ELM327 V1.5`, `?`, a protocol name —
  // so there is no shape to check beyond it not being empty.
  if (isAtCommand(cmd)) return true;

  // The adapter reporting why it has no data is still an answer to this command.
  if (matchedErrorPhrase(text)) return true;

  const compact = normalizeCommand(cmd);
  const prefix = expectedReplyPrefix(compact);
  if (!prefix) return true;

  const refusal = '7F' + compact.slice(0, 2);
  const { frames } = groupFrames(stripTransientPhrases(text));

  for (const frame of frames) {
    // With echo left on, the command comes back before its answer.
    const body = frame.startsWith(compact) ? frame.slice(compact.length) : frame;

    if (body.startsWith(prefix)) return true;
    if (body.startsWith(refusal)) return true;

    // A four-character marker like `410C` names one specific PID, so finding it
    // at a byte boundary anywhere in the frame identifies the reply well enough.
    // Two-character markers are not selective enough to allow the same latitude:
    // `43` appears inside the ordinary mode 01 answer `414300`, and accepting
    // that as a stored-code list is how a healthy car grows a fault.
    if (prefix.length > 2 && markerOffset(body, prefix) !== -1) return true;
  }

  // Some adapters answer a clear-codes request with `OK` instead of `44`.
  if (compact === '04' && /\bOK\b/.test(text)) return true;

  return false;
}
