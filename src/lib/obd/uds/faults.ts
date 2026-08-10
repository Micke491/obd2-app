import { decodeDtcBytes } from '../dtc/parser';

/**
 * What a module reports about one fault.
 *
 * The first two bytes are the code in the same encoding mode 03 uses, so they
 * go through the existing decoder and land in the catalog already written. The
 * third byte says how the circuit failed and the fourth says whether it is
 * failing now — neither of which mode 03 can express at all.
 */
export type FaultStatus = {
  /** ISO 14229 bit 0, testFailed: the fault is present this moment. */
  failingNow: boolean;
  /** ISO 14229 bit 3, confirmedDTC: stored, having failed often enough to count. */
  confirmed: boolean;
  raw: number;
};

export type ModuleFault = {
  code: string;
  /** Null on KWP, which has no failure type byte. */
  failureType: number | null;
  failureTypeLabel: string | null;
  status: FaultStatus;
};

/** ISO 14229-1 Annex D. Only the entries that can be stated plainly. */
export const FAILURE_TYPES: Record<number, string> = {
  0x00: 'No further detail',
  0x11: 'Circuit shorted to ground',
  0x12: 'Circuit shorted to battery',
  0x13: 'Circuit open',
  0x14: 'Circuit shorted to ground or open',
  0x15: 'Circuit shorted to battery or open',
  0x1c: 'Circuit voltage out of range',
  0x21: 'Signal too low',
  0x22: 'Signal too high',
  0x29: 'Signal invalid',
  0x2f: 'Signal erratic',
  0x31: 'No signal',
  0x38: 'Signal below the allowed range',
  0x39: 'Signal above the allowed range',
  0x62: 'Signal does not match another sensor',
  0x64: 'Signal not plausible',
  0x71: 'Actuator stuck',
  0x73: 'Actuator stuck closed',
  0x81: 'Invalid data received',
  0x87: 'Expected message missing',
  0x92: 'Performance or incorrect operation',
};

function statusOf(raw: number): FaultStatus {
  return { failingNow: (raw & 0x01) !== 0, confirmed: (raw & 0x08) !== 0, raw };
}

const hexByte = (value: number) => `0x${value.toString(16).toUpperCase().padStart(2, '0')}`;

export function decodeUdsFault(bytes: number[]): ModuleFault | null {
  if (bytes.length < 4) return null;

  const code = decodeDtcBytes(bytes[0], bytes[1]);
  if (!code) return null;

  const failureType = bytes[2];
  return {
    code,
    failureType,
    // An unrecognised byte is shown as itself. Guessing at it would be the
    // same mistake as naming a manufacturer trouble code.
    failureTypeLabel: FAILURE_TYPES[failureType] ?? hexByte(failureType),
    status: statusOf(bytes[3]),
  };
}

export function decodeKwpFault(bytes: number[]): ModuleFault | null {
  if (bytes.length < 3) return null;

  const code = decodeDtcBytes(bytes[0], bytes[1]);
  if (!code) return null;

  return { code, failureType: null, failureTypeLabel: null, status: statusOf(bytes[2]) };
}

/** `C0035-11`, or plain `C0035` when there is no failure type to add. */
export function faultLabel(fault: ModuleFault): string {
  if (fault.failureType === null) return fault.code;
  return `${fault.code}-${fault.failureType.toString(16).toUpperCase().padStart(2, '0')}`;
}
