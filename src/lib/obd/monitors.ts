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
