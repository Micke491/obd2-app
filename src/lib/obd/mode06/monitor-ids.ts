/** Where a monitor's name came from, so a worked-out one never reads as gospel. */
export type MonitorConfidence = 'named' | 'derived' | 'manufacturer' | 'unlisted';

export type MonitorFamily =
  | 'o2'
  | 'o2-heater'
  | 'catalyst'
  | 'evap'
  | 'egr'
  | 'misfire'
  | 'manufacturer'
  | 'other';

/** Mirrors CONFIDENCE_LABELS in dtc/types.ts: the label says how it was arrived at. */
export const MONITOR_CONFIDENCE_LABELS: Record<MonitorConfidence, string> = {
  named: 'Standard test',
  derived: 'Read from the monitor number',
  manufacturer: 'Manufacturer-defined',
  unlisted: 'Unlisted monitor',
};

export const FAMILY_LABELS: Record<MonitorFamily, string> = {
  o2: 'Oxygen sensors',
  'o2-heater': 'Oxygen sensor heaters',
  catalyst: 'Catalyst',
  evap: 'Evaporative system',
  egr: 'EGR and purge',
  misfire: 'Misfire',
  manufacturer: 'Manufacturer-defined',
  other: 'Other',
};

/** Resting order. Failures are lifted out of it by the screen. */
export const FAMILY_ORDER: MonitorFamily[] = [
  'misfire',
  'catalyst',
  'o2',
  'o2-heater',
  'evap',
  'egr',
  'other',
  'manufacturer',
];

const NAMES: Record<number, string> = {
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
 * Bank and sensor from a zero-based index into a four-sensors-per-bank range.
 *
 * Deliberately agrees with the table above rather than competing with it:
 * index 4 is bank 2 sensor 1, which is what 0x05 is listed as.
 */
function bankAndSensor(index: number): string {
  return `bank ${Math.floor(index / 4) + 1} sensor ${(index % 4) + 1}`;
}

function familyFor(mid: number): MonitorFamily {
  if (mid >= 0xe0) return 'manufacturer';
  if (mid === 0x81 || (mid >= 0xa1 && mid <= 0xac)) return 'misfire';
  if (mid >= 0x01 && mid <= 0x20) return 'o2';
  if (mid >= 0x21 && mid <= 0x2f) return 'catalyst';
  if (mid >= 0x31 && mid <= 0x38) return 'egr';
  if (mid >= 0x39 && mid <= 0x3d) return 'evap';
  if (mid >= 0x41 && mid <= 0x50) return 'o2-heater';
  return 'other';
}

/**
 * What a monitor id means, and how confident that is.
 *
 * The table comes first. Past it, several ranges in J1979 are laid out
 * regularly enough that position is arithmetic rather than a lookup — oxygen
 * sensors and their heaters run four to a bank, misfire runs one per cylinder
 * from 0xA1 — and those are marked derived so they never read as certain.
 *
 * 0xE0 and up is manufacturer territory and gets no name at all. Naming it
 * would mean shipping somebody's reverse-engineered list, which is the one
 * thing this app refuses to do. It is still reported: a test the app cannot
 * name may be the only evidence of a fault that is developing.
 */
export function describeMonitor(mid: number): {
  name: string;
  confidence: MonitorConfidence;
  family: MonitorFamily;
} {
  const hex = mid.toString(16).toUpperCase().padStart(2, '0');
  const family = familyFor(mid);

  const listed = NAMES[mid];
  if (listed) return { name: listed, confidence: 'named', family };

  if (mid >= 0xe0) {
    return { name: `Manufacturer test 0x${hex}`, confidence: 'manufacturer', family };
  }

  if (mid >= 0x01 && mid <= 0x20) {
    return { name: `O2 sensor ${bankAndSensor(mid - 0x01)}`, confidence: 'derived', family };
  }
  if (mid >= 0x21 && mid <= 0x2f) {
    return { name: `Catalyst bank ${mid - 0x20}`, confidence: 'derived', family };
  }
  if (mid >= 0x41 && mid <= 0x50) {
    return { name: `O2 heater ${bankAndSensor(mid - 0x41)}`, confidence: 'derived', family };
  }
  if (mid >= 0xa1 && mid <= 0xac) {
    return { name: `Misfire cylinder ${mid - 0xa0}`, confidence: 'derived', family };
  }

  return { name: `Monitor 0x${hex}`, confidence: 'unlisted', family };
}
