import { extractPayload, hexToBytes } from './protocol';

export const INFO_VIN = '02';
export const INFO_CALIBRATION_ID = '04';
export const INFO_CVN = '06';
export const INFO_ECU_NAME = '0A';

/** ELM327 protocol numbers reported by ATDPN. */
const PROTOCOL_NAMES: Record<string, string> = {
  '0': 'Automatic',
  '1': 'SAE J1850 PWM',
  '2': 'SAE J1850 VPW',
  '3': 'ISO 9141-2',
  '4': 'ISO 14230-4 KWP (5 baud init)',
  '5': 'ISO 14230-4 KWP (fast init)',
  '6': 'ISO 15765-4 CAN (11 bit, 500 kbaud)',
  '7': 'ISO 15765-4 CAN (29 bit, 500 kbaud)',
  '8': 'ISO 15765-4 CAN (11 bit, 250 kbaud)',
  '9': 'ISO 15765-4 CAN (29 bit, 250 kbaud)',
  A: 'SAE J1939 CAN',
  B: 'User 1 CAN',
  C: 'User 2 CAN',
};

/**
 * ATDPN answers with the protocol number, prefixed by `A` when the protocol was
 * reached by automatic search rather than being set explicitly.
 */
export function describeProtocol(raw: string): string {
  const cleaned = raw.replace(/[\r\n>\s]/g, '').toUpperCase();
  const automatic = cleaned.startsWith('A') && cleaned.length > 1;
  const number = automatic ? cleaned.slice(1) : cleaned;
  const name = PROTOCOL_NAMES[number];

  if (!name) return cleaned || 'Unknown';
  return automatic ? `${name} (auto)` : name;
}

function bytesToAscii(bytes: number[]): string {
  return bytes
    .filter((byte) => byte >= 0x20 && byte <= 0x7e)
    .map((byte) => String.fromCharCode(byte))
    .join('')
    .trim();
}

/**
 * Reads a Mode 09 text field.
 *
 * The payload opens with a count of data items; the VIN is a single 17-byte
 * item, while calibration IDs and ECU names can repeat. Non-printable bytes are
 * padding and are dropped.
 */
export function parseInfoText(hex: string, infoType: string): string | null {
  const payload = extractPayload(hex, '49', infoType);
  if (!payload || payload.length === 0) return null;

  // A leading small count byte precedes the data on CAN replies.
  const body = payload[0] <= 0x08 ? payload.slice(1) : payload;
  const text = bytesToAscii(body);

  return text.length > 0 ? text : null;
}

/** VINs are exactly 17 characters and never contain I, O or Q. */
export function isPlausibleVin(vin: string): boolean {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);
}

export function parseVin(hex: string): string | null {
  const text = parseInfoText(hex, INFO_VIN);
  if (!text) return null;

  const compact = text.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return isPlausibleVin(compact) ? compact : text;
}

/** CVNs are checksums, so they stay hexadecimal rather than being decoded. */
export function parseCvn(hex: string): string | null {
  const payload = extractPayload(hex, '49', INFO_CVN);
  if (!payload || payload.length === 0) return null;

  const body = payload[0] <= 0x08 ? payload.slice(1) : payload;
  const text = body
    .map((byte) => byte.toString(16).toUpperCase().padStart(2, '0'))
    .join('');

  return text.replace(/(00)+$/, '') || null;
}

export { hexToBytes };
