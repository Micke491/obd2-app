/**
 * OBD-II Mode 01 PID decoding.
 *
 * Pure functions — no React, no Bluetooth. This is the one layer that can be
 * verified without a car attached, which matters because a decoding bug is
 * silent: it shows a plausible number that happens to be wrong.
 */

/** Mode 01 (current data) request for engine speed. */
export const PID_ENGINE_RPM = '010C';

/** Mode 01 responses come back as mode + 0x40. */
const RESPONSE_MODE = '41';
const RPM_PID = '0C';

/**
 * Words the adapter emits that are not payload.
 *
 * These are removed *before* non-hex characters are stripped, and that order is
 * load-bearing: `NO DATA` reduces to `DAA` under a naive hex filter, and
 * `SEARCHING` to `EAC`. Filtering first would inject those into the byte stream
 * and let a status message decode as a reading.
 *
 * Removing rather than rejecting also matters — a real reply often arrives as
 * `SEARCHING...410C1AF8`, so bailing out on the word would discard good data.
 */
const NON_PAYLOAD = [
  /SEARCHING/g,
  /BUS\s*INIT/g,
  /UNABLE\s*TO\s*CONNECT/g,
  /NO\s*DATA/g,
  /STOPPED/g,
  /ERROR/g,
  /BUS\s*BUSY/g,
  /LV\s*RESET/g,
  /OK/g,
];

/** Strips status text and formatting, leaving only payload hex digits. */
export function toHexStream(raw: string): string {
  let text = raw.toUpperCase();
  for (const pattern of NON_PAYLOAD) {
    text = text.replace(pattern, ' ');
  }
  return text.replace(/[^0-9A-F]/g, '');
}

/**
 * Pulls `byteCount` bytes following the `<responseMode><pid>` marker.
 *
 * Searching for the marker rather than reading from a fixed offset handles both
 * a surviving command echo (`010C410C1AF8`) and multi-ECU replies, where several
 * frames are concatenated and the first is the one that counts.
 */
export function extractPidBytes(raw: string, responseMode: string, pid: string, byteCount: number): number[] | null {
  const hex = toHexStream(raw);
  const marker = responseMode + pid;
  const start = hex.indexOf(marker);
  if (start === -1) return null;

  const payloadStart = start + marker.length;
  if (hex.length < payloadStart + byteCount * 2) return null;

  const bytes: number[] = [];
  for (let i = 0; i < byteCount; i += 1) {
    const offset = payloadStart + i * 2;
    const byte = Number.parseInt(hex.slice(offset, offset + 2), 16);
    if (Number.isNaN(byte)) return null;
    bytes.push(byte);
  }

  return bytes;
}

/**
 * Decodes engine speed from a `010C` response.
 *
 * Two bytes, quarter-RPM resolution: `RPM = ((A * 256) + B) / 4`.
 * Example: `410C1AF8` -> A=0x1A(26), B=0xF8(248) -> (26*256+248)/4 = 1726.
 *
 * Returns null when the response holds no reading, which is normal rather than
 * exceptional — the adapter answers `NO DATA` whenever the engine is off.
 */
export function parseRpm(raw: string): number | null {
  const bytes = extractPidBytes(raw, RESPONSE_MODE, RPM_PID, 2);
  if (!bytes) return null;

  const [a, b] = bytes;
  const rpm = (a * 256 + b) / 4;

  // 16383.75 is the protocol ceiling; anything at it is a stuck bus, not an engine.
  if (rpm < 0 || rpm >= 16383) return null;

  return Math.round(rpm);
}
