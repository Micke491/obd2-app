import { extractPayload } from '../protocol';
import { describeMonitor, type MonitorConfidence, type MonitorFamily } from './monitor-ids';

/** Which bounds the car actually supplied for a test. */
export type TestLimit = 'both' | 'upper' | 'lower' | 'none';

export type MonitorTest = {
  monitorId: number;
  monitorName: string;
  /** How the name was arrived at — a table entry, arithmetic, or neither. */
  confidence: MonitorConfidence;
  family: MonitorFamily;
  testId: number;
  value: number;
  min: number;
  max: number;
  unit: string;
  /** Null when the scaling ID is unrecognised and values are raw counts. */
  scaled: boolean;
  limit: TestLimit;
  /** Where the value sits between its bounds, 0–1. Null without both. */
  fraction: number | null;
  passed: boolean;
};

/**
 * Unit and scaling identifiers from J1979. Only entries that can be stated
 * confidently are listed; anything else falls through to raw counts, which
 * still supports the pass/fail comparison.
 */
const SCALING: Record<number, { unit: string; multiplier: number; offset?: number }> = {
  0x01: { unit: '', multiplier: 1 },
  0x02: { unit: '', multiplier: 0.1 },
  0x03: { unit: '', multiplier: 0.01 },
  0x04: { unit: '', multiplier: 0.001 },
  0x07: { unit: 'rpm', multiplier: 0.25 },
  0x09: { unit: 'km/h', multiplier: 1 },
  0x0b: { unit: 'V', multiplier: 0.001 },
  0x0c: { unit: 'V', multiplier: 0.01 },
  0x10: { unit: 'ms', multiplier: 1 },
  0x12: { unit: 's', multiplier: 1 },
  0x14: { unit: 'Ω', multiplier: 1 },
  0x16: { unit: '°C', multiplier: 0.1, offset: -40 },
  0x1a: { unit: 'kPa', multiplier: 1 },
  0x24: { unit: '', multiplier: 1 },
};

/**
 * Parses Mode 06 results, which arrive as fixed nine-byte records:
 * monitor id, test id, scaling id, then value, minimum and maximum as 16-bit
 * words. A test passes when its value lies within the reported limits.
 */
export function parseMonitorTests(hex: string): MonitorTest[] {
  const payload = extractPayload(hex, '46');
  if (!payload) return [];

  const tests: MonitorTest[] = [];

  for (let i = 0; i + 8 < payload.length; i += 9) {
    const monitorId = payload[i];
    const testId = payload[i + 1];
    const scalingId = payload[i + 2];
    const rawValue = payload[i + 3] * 256 + payload[i + 4];
    const rawMin = payload[i + 5] * 256 + payload[i + 6];
    const rawMax = payload[i + 7] * 256 + payload[i + 8];

    if (monitorId === 0) continue;

    const scaling = SCALING[scalingId];
    const apply = (raw: number) => (scaling ? raw * scaling.multiplier + (scaling.offset ?? 0) : raw);

    const value = apply(rawValue);
    const min = apply(rawMin);
    const max = apply(rawMax);

    // J1979 reports an absent bound as the extreme of the range: a test with
    // only a ceiling comes back with a zero floor, one with only a floor with
    // a 0xFFFF ceiling. Reading those back as real numbers is what produced
    // "allowed 0.00-200.00" for a test that never had a lower bound at all,
    // and it is checked on the raw words because scaling would move them.
    const hasLower = rawMin !== 0x0000;
    const hasUpper = rawMax !== 0xffff;
    const limit: TestLimit =
      hasLower && hasUpper ? 'both' : hasUpper ? 'upper' : hasLower ? 'lower' : 'none';

    const described = describeMonitor(monitorId);

    tests.push({
      monitorId,
      monitorName: described.name,
      confidence: described.confidence,
      family: described.family,
      testId,
      value,
      min,
      max,
      unit: scaling?.unit ?? '',
      scaled: Boolean(scaling),
      limit,
      fraction: limit === 'both' && max > min ? (value - min) / (max - min) : null,
      passed: (!hasLower || value >= min) && (!hasUpper || value <= max),
    });
  }

  return tests;
}
