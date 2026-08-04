/** Adapter-level failures. A response containing one of these carries no data. */
const ERROR_PHRASES: Array<[RegExp, string]> = [
  [/UNABLE\s*TO\s*CONNECT/, 'Adapter could not reach the ECU'],
  [/CAN\s*ERROR/, 'CAN bus error'],
  [/BUS\s*ERROR/, 'Bus error'],
  [/DATA\s*ERROR/, 'Data error'],
  [/FB\s*ERROR/, 'Feedback error'],
  [/BUS\s*BUSY/, 'Bus busy'],
  [/LV\s*RESET/, 'Adapter browned out'],
  [/STOPPED/, 'Request stopped'],
  [/NO\s*DATA/, 'No data'],
  [/^\s*\?\s*$/, 'Adapter did not understand the command'],
];

/** Emitted during protocol negotiation. Progress, not failure. */
const TRANSIENT_PHRASES = [/SEARCHING\.*/g, /BUS\s*INIT\.*/g, /\bOK\b/g];

export type ObdResponse = { ok: true; hex: string; declaredBytes: number | null } | { ok: false; reason: string };

/**
 * Turns a raw adapter reply into a contiguous hex payload.
 *
 * Error phrases are matched on the text and returned as failures rather than
 * filtered out, because stripping non-hex characters from them would inject
 * digits into the payload: `NO DATA` reduces to `DAA`, `SEARCHING` to `EAC`.
 */
export function parseResponse(raw: string): ObdResponse {
  const text = raw.replace(/[\r\n]+/g, '\n').toUpperCase();

  for (const [pattern, reason] of ERROR_PHRASES) {
    if (pattern.test(text)) return { ok: false, reason };
  }

  let cleaned = text;
  for (const pattern of TRANSIENT_PHRASES) cleaned = cleaned.replace(pattern, ' ');

  const { hex, declaredBytes } = assembleFrames(cleaned);
  if (!hex) return { ok: false, reason: 'Empty response' };

  return { ok: true, hex, declaredBytes };
}

/**
 * Joins an ISO-TP multi-frame reply into one hex string.
 *
 * A long CAN response arrives as a byte-count header followed by sequenced
 * lines, which must be stripped of their `N:` prefixes before concatenation:
 *
 *   014          <- total payload bytes, hex
 *   0:490201314434
 *   1:47503030523535
 *
 * Single-frame replies have neither header nor prefixes and pass through.
 */
export function assembleFrames(text: string): { hex: string; declaredBytes: number | null } {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  let declaredBytes: number | null = null;
  const parts: string[] = [];

  for (const line of lines) {
    if (/^[0-9A-F]{3}$/.test(line)) {
      declaredBytes = Number.parseInt(line, 16);
      continue;
    }

    const sequenced = line.match(/^[0-9A-F]:\s*(.*)$/);
    parts.push(sequenced ? sequenced[1] : line);
  }

  const hex = parts.join('').replace(/[^0-9A-F]/g, '');
  return { hex, declaredBytes };
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
 * Extracts the payload following a `<mode+0x40><pid>` marker.
 *
 * Searching for the marker rather than reading a fixed offset tolerates a
 * surviving command echo and multi-ECU replies, where frames are concatenated
 * and the first match is the one to use.
 */
export function extractPayload(hex: string, responseMode: string, pid?: string): number[] | null {
  const marker = responseMode + (pid ?? '');
  const start = hex.indexOf(marker);
  if (start === -1) return null;
  return hexToBytes(hex.slice(start + marker.length));
}

/** Mode NN -> its positive response prefix, e.g. `01` -> `41`. */
export function responseModeFor(mode: string): string {
  return (Number.parseInt(mode, 16) + 0x40).toString(16).toUpperCase().padStart(2, '0');
}
