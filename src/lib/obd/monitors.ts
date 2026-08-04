import { extractPayload } from './protocol';

export type MonitorState = 'complete' | 'incomplete' | 'unsupported';

export type ReadinessMonitor = {
  name: string;
  state: MonitorState;
};

export type ReadinessStatus = {
  milOn: boolean;
  dtcCount: number;
  /** Compression ignition means diesel, which uses a different monitor set. */
  compressionIgnition: boolean;
  monitors: ReadinessMonitor[];
};

/** Bit positions are shared between the "available" and "incomplete" bytes. */
const SPARK_MONITORS = [
  'Catalyst',
  'Heated catalyst',
  'Evaporative system',
  'Secondary air system',
  'A/C refrigerant',
  'Oxygen sensor',
  'Oxygen sensor heater',
  'EGR system',
];

const COMPRESSION_MONITORS = [
  'NMHC catalyst',
  'NOx/SCR aftertreatment',
  'Reserved',
  'Boost pressure',
  'Reserved',
  'Exhaust gas sensor',
  'PM filter',
  'EGR/VVT system',
];

/**
 * Decodes Mode 01 PID 01.
 *
 * Byte A carries the MIL bit and stored-code count. Byte B holds the three
 * continuous monitors plus the fuel-type flag; bytes C and D hold availability
 * and completeness for the non-continuous monitors, one bit each, at matching
 * positions — so a monitor is only meaningful when its C bit is set.
 */
export function parseReadiness(hex: string): ReadinessStatus | null {
  const payload = extractPayload(hex, '41', '01');
  if (!payload || payload.length < 4) return null;

  const [a, b, c, d] = payload;
  const compressionIgnition = ((b >> 3) & 1) === 1;

  const monitors: ReadinessMonitor[] = [];

  const continuous = ['Misfire', 'Fuel system', 'Components'];
  continuous.forEach((name, index) => {
    const available = (b >> index) & 1;
    const incomplete = (b >> (index + 4)) & 1;
    monitors.push({
      name,
      state: !available ? 'unsupported' : incomplete ? 'incomplete' : 'complete',
    });
  });

  const names = compressionIgnition ? COMPRESSION_MONITORS : SPARK_MONITORS;
  names.forEach((name, index) => {
    if (name === 'Reserved') return;
    const available = (c >> index) & 1;
    const incomplete = (d >> index) & 1;
    monitors.push({
      name,
      state: !available ? 'unsupported' : incomplete ? 'incomplete' : 'complete',
    });
  });

  return {
    milOn: ((a >> 7) & 1) === 1,
    dtcCount: a & 0x7f,
    compressionIgnition,
    monitors,
  };
}

export type MonitorTest = {
  monitorId: number;
  monitorName: string;
  testId: number;
  value: number;
  min: number;
  max: number;
  unit: string;
  /** Null when the scaling ID is unrecognised and values are raw counts. */
  scaled: boolean;
  passed: boolean;
};

const OBDMID_NAMES: Record<number, string> = {
  0x01: 'O2 sensor bank 1 sensor 1',
  0x02: 'O2 sensor bank 1 sensor 2',
  0x03: 'O2 sensor bank 1 sensor 3',
  0x04: 'O2 sensor bank 1 sensor 4',
  0x05: 'O2 sensor bank 2 sensor 1',
  0x06: 'O2 sensor bank 2 sensor 2',
  0x07: 'O2 sensor bank 2 sensor 3',
  0x08: 'O2 sensor bank 2 sensor 4',
  0x21: 'Catalyst bank 1',
  0x22: 'Catalyst bank 2',
  0x31: 'EGR bank 1',
  0x32: 'EGR bank 2',
  0x39: 'EVAP monitor (cap off)',
  0x3a: 'EVAP monitor (0.090")',
  0x3b: 'EVAP monitor (0.040")',
  0x3c: 'EVAP monitor (0.020")',
  0x3d: 'Purge flow monitor',
  0x41: 'O2 heater bank 1 sensor 1',
  0x42: 'O2 heater bank 1 sensor 2',
  0x81: 'Misfire general data',
  0xa1: 'Misfire cylinder 1',
  0xa2: 'Misfire cylinder 2',
  0xa3: 'Misfire cylinder 3',
  0xa4: 'Misfire cylinder 4',
  0xa5: 'Misfire cylinder 5',
  0xa6: 'Misfire cylinder 6',
  0xa7: 'Misfire cylinder 7',
  0xa8: 'Misfire cylinder 8',
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

    tests.push({
      monitorId,
      monitorName: OBDMID_NAMES[monitorId] ?? `Monitor 0x${monitorId.toString(16).toUpperCase()}`,
      testId,
      value,
      min,
      max,
      unit: scaling?.unit ?? '',
      scaled: Boolean(scaling),
      passed: value >= min && value <= max,
    });
  }

  return tests;
}
