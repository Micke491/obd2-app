import { PID_GROUPS, type PidGroup } from './pid-groups';
import { PID_QUANTITY_OVERRIDE, UNIT_TO_QUANTITY, type Quantity } from '@/lib/units/quantities';

export type PidDefinition = {
  pid: string;
  name: string;
  /** Compact label for gauges and tight rows. */
  short: string;
  /** The canonical unit the ECU reports in; display units convert from it. */
  unit: string;
  bytes: number;
  decode: (b: number[]) => number | null;
  min: number;
  max: number;
  /** Set on enumerated PIDs whose numeric value is meaningless on its own. */
  describe?: (b: number[]) => string | null;
  /**
   * Filled in by normalisation below rather than written onto each literal —
   * see the note above PID_DEFINITIONS.
   */
  quantity: Quantity;
  group: PidGroup;
  /** Pins display precision where the magnitude heuristic gets it wrong. */
  decimals?: number;
};

/** Definitions as authored: everything except the derived fields. */
type RawPidDefinition = Omit<PidDefinition, 'quantity' | 'group'>;

const u16 = (b: number[]) => b[0] * 256 + b[1];
/** Two's-complement 16-bit, used by the pressure and timing PIDs. */
const i16 = (b: number[]) => {
  const raw = u16(b);
  return raw > 0x7fff ? raw - 0x10000 : raw;
};
const percent = (b: number[]) => (b[0] * 100) / 255;
/** Fuel-trim scaling: 128 counts is 0 %, full scale is ±100 %. */
const trim = (b: number[]) => b[0] / 1.28 - 100;
const tempC = (b: number[]) => b[0] - 40;

const FUEL_TYPES: Record<number, string> = {
  0: 'Not available',
  1: 'Petrol',
  2: 'Methanol',
  3: 'Ethanol',
  4: 'Diesel',
  5: 'LPG',
  6: 'CNG',
  7: 'Propane',
  8: 'Electric',
  9: 'Bifuel petrol',
  10: 'Bifuel methanol',
  11: 'Bifuel ethanol',
  12: 'Bifuel LPG',
  13: 'Bifuel CNG',
  14: 'Bifuel propane',
  15: 'Bifuel electric',
  17: 'Hybrid petrol',
  18: 'Hybrid ethanol',
  19: 'Hybrid diesel',
  20: 'Hybrid electric',
};

const OBD_STANDARDS: Record<number, string> = {
  1: 'OBD-II (CARB)',
  2: 'OBD (EPA)',
  3: 'OBD and OBD-II',
  4: 'OBD-I',
  5: 'Not OBD compliant',
  6: 'EOBD',
  7: 'EOBD and OBD-II',
  8: 'EOBD and OBD',
  9: 'EOBD, OBD and OBD-II',
  10: 'JOBD',
  11: 'JOBD and OBD-II',
  12: 'JOBD and EOBD',
  13: 'JOBD, EOBD and OBD-II',
};

const FUEL_SYSTEM: Record<number, string> = {
  0: 'Off',
  1: 'Open loop, engine cold',
  2: 'Closed loop, using O2 sensor',
  4: 'Open loop, load or deceleration',
  8: 'Open loop, system fault',
  16: 'Closed loop, O2 sensor fault',
};

/** Standard Mode 01 PIDs. Formulas follow SAE J1979. */
const RAW_PID_DEFINITIONS: RawPidDefinition[] = [
  { pid: '03', name: 'Fuel system status', short: 'Fuel sys', unit: '', bytes: 2, decode: (b) => b[0], min: 0, max: 16,
    describe: (b) => FUEL_SYSTEM[b[0]] ?? `Unknown (${b[0]})` },
  { pid: '04', name: 'Calculated engine load', short: 'Load', unit: '%', bytes: 1, decode: percent, min: 0, max: 100 },
  { pid: '05', name: 'Engine coolant temperature', short: 'Coolant', unit: '°C', bytes: 1, decode: tempC, min: -40, max: 215 },
  { pid: '06', name: 'Short term fuel trim, bank 1', short: 'STFT B1', unit: '%', bytes: 1, decode: trim, min: -100, max: 99 },
  { pid: '07', name: 'Long term fuel trim, bank 1', short: 'LTFT B1', unit: '%', bytes: 1, decode: trim, min: -100, max: 99 },
  { pid: '08', name: 'Short term fuel trim, bank 2', short: 'STFT B2', unit: '%', bytes: 1, decode: trim, min: -100, max: 99 },
  { pid: '09', name: 'Long term fuel trim, bank 2', short: 'LTFT B2', unit: '%', bytes: 1, decode: trim, min: -100, max: 99 },
  { pid: '0A', name: 'Fuel pressure', short: 'Fuel press', unit: 'kPa', bytes: 1, decode: (b) => b[0] * 3, min: 0, max: 765 },
  { pid: '0B', name: 'Intake manifold pressure', short: 'MAP', unit: 'kPa', bytes: 1, decode: (b) => b[0], min: 0, max: 255 },
  { pid: '0C', name: 'Engine speed', short: 'RPM', unit: 'rpm', bytes: 2, decode: (b) => u16(b) / 4, min: 0, max: 8000 },
  { pid: '0D', name: 'Vehicle speed', short: 'Speed', unit: 'km/h', bytes: 1, decode: (b) => b[0], min: 0, max: 255 },
  { pid: '0E', name: 'Timing advance', short: 'Timing', unit: '°', bytes: 1, decode: (b) => b[0] / 2 - 64, min: -64, max: 63 },
  { pid: '0F', name: 'Intake air temperature', short: 'Intake air', unit: '°C', bytes: 1, decode: tempC, min: -40, max: 215 },
  { pid: '10', name: 'Mass air flow', short: 'MAF', unit: 'g/s', bytes: 2, decode: (b) => u16(b) / 100, min: 0, max: 655 },
  { pid: '11', name: 'Throttle position', short: 'Throttle', unit: '%', bytes: 1, decode: percent, min: 0, max: 100 },
  { pid: '14', name: 'O2 sensor 1, bank 1', short: 'O2 B1S1', unit: 'V', bytes: 2, decode: (b) => b[0] / 200, min: 0, max: 1.275 },
  { pid: '15', name: 'O2 sensor 2, bank 1', short: 'O2 B1S2', unit: 'V', bytes: 2, decode: (b) => b[0] / 200, min: 0, max: 1.275 },
  { pid: '16', name: 'O2 sensor 3, bank 1', short: 'O2 B1S3', unit: 'V', bytes: 2, decode: (b) => b[0] / 200, min: 0, max: 1.275 },
  { pid: '17', name: 'O2 sensor 4, bank 1', short: 'O2 B1S4', unit: 'V', bytes: 2, decode: (b) => b[0] / 200, min: 0, max: 1.275 },
  { pid: '18', name: 'O2 sensor 1, bank 2', short: 'O2 B2S1', unit: 'V', bytes: 2, decode: (b) => b[0] / 200, min: 0, max: 1.275 },
  { pid: '19', name: 'O2 sensor 2, bank 2', short: 'O2 B2S2', unit: 'V', bytes: 2, decode: (b) => b[0] / 200, min: 0, max: 1.275 },
  { pid: '1A', name: 'O2 sensor 3, bank 2', short: 'O2 B2S3', unit: 'V', bytes: 2, decode: (b) => b[0] / 200, min: 0, max: 1.275 },
  { pid: '1B', name: 'O2 sensor 4, bank 2', short: 'O2 B2S4', unit: 'V', bytes: 2, decode: (b) => b[0] / 200, min: 0, max: 1.275 },
  { pid: '1C', name: 'OBD standard', short: 'Standard', unit: '', bytes: 1, decode: (b) => b[0], min: 0, max: 255,
    describe: (b) => OBD_STANDARDS[b[0]] ?? `Unknown (${b[0]})` },
  { pid: '1F', name: 'Run time since engine start', short: 'Run time', unit: 's', bytes: 2, decode: u16, min: 0, max: 65535 },
  { pid: '21', name: 'Distance travelled with MIL on', short: 'Dist MIL', unit: 'km', bytes: 2, decode: u16, min: 0, max: 65535 },
  { pid: '22', name: 'Fuel rail pressure (relative)', short: 'Rail press', unit: 'kPa', bytes: 2, decode: (b) => u16(b) * 0.079, min: 0, max: 5177 },
  { pid: '23', name: 'Fuel rail gauge pressure', short: 'Rail gauge', unit: 'kPa', bytes: 2, decode: (b) => u16(b) * 10, min: 0, max: 655350 },
  { pid: '24', name: 'O2 sensor 1 lambda', short: 'λ B1S1', unit: '', bytes: 4, decode: (b) => u16(b) / 32768, min: 0, max: 2 },
  { pid: '25', name: 'O2 sensor 2 lambda', short: 'λ B1S2', unit: '', bytes: 4, decode: (b) => u16(b) / 32768, min: 0, max: 2 },
  { pid: '26', name: 'O2 sensor 3 lambda', short: 'λ B1S3', unit: '', bytes: 4, decode: (b) => u16(b) / 32768, min: 0, max: 2 },
  { pid: '27', name: 'O2 sensor 4 lambda', short: 'λ B1S4', unit: '', bytes: 4, decode: (b) => u16(b) / 32768, min: 0, max: 2 },
  { pid: '2C', name: 'Commanded EGR', short: 'EGR cmd', unit: '%', bytes: 1, decode: percent, min: 0, max: 100 },
  { pid: '2D', name: 'EGR error', short: 'EGR err', unit: '%', bytes: 1, decode: trim, min: -100, max: 99 },
  { pid: '2E', name: 'Commanded evaporative purge', short: 'Evap purge', unit: '%', bytes: 1, decode: percent, min: 0, max: 100 },
  { pid: '2F', name: 'Fuel tank level', short: 'Fuel level', unit: '%', bytes: 1, decode: percent, min: 0, max: 100 },
  { pid: '30', name: 'Warm-ups since codes cleared', short: 'Warm-ups', unit: '', bytes: 1, decode: (b) => b[0], min: 0, max: 255 },
  { pid: '31', name: 'Distance since codes cleared', short: 'Dist clear', unit: 'km', bytes: 2, decode: u16, min: 0, max: 65535 },
  { pid: '32', name: 'Evaporative system vapour pressure', short: 'Evap press', unit: 'Pa', bytes: 2, decode: (b) => i16(b) / 4, min: -8192, max: 8192 },
  { pid: '33', name: 'Absolute barometric pressure', short: 'Baro', unit: 'kPa', bytes: 1, decode: (b) => b[0], min: 0, max: 255 },
  { pid: '3C', name: 'Catalyst temperature, bank 1 sensor 1', short: 'Cat B1S1', unit: '°C', bytes: 2, decode: (b) => u16(b) / 10 - 40, min: -40, max: 6513 },
  { pid: '3D', name: 'Catalyst temperature, bank 2 sensor 1', short: 'Cat B2S1', unit: '°C', bytes: 2, decode: (b) => u16(b) / 10 - 40, min: -40, max: 6513 },
  { pid: '3E', name: 'Catalyst temperature, bank 1 sensor 2', short: 'Cat B1S2', unit: '°C', bytes: 2, decode: (b) => u16(b) / 10 - 40, min: -40, max: 6513 },
  { pid: '3F', name: 'Catalyst temperature, bank 2 sensor 2', short: 'Cat B2S2', unit: '°C', bytes: 2, decode: (b) => u16(b) / 10 - 40, min: -40, max: 6513 },
  { pid: '42', name: 'Control module voltage', short: 'Module V', unit: 'V', bytes: 2, decode: (b) => u16(b) / 1000, min: 0, max: 65 },
  { pid: '43', name: 'Absolute load value', short: 'Abs load', unit: '%', bytes: 2, decode: (b) => (u16(b) * 100) / 255, min: 0, max: 25700 },
  { pid: '44', name: 'Commanded air-fuel equivalence ratio', short: 'λ cmd', unit: '', bytes: 2, decode: (b) => u16(b) / 32768, min: 0, max: 2 },
  { pid: '45', name: 'Relative throttle position', short: 'Rel throttle', unit: '%', bytes: 1, decode: percent, min: 0, max: 100 },
  { pid: '46', name: 'Ambient air temperature', short: 'Ambient', unit: '°C', bytes: 1, decode: tempC, min: -40, max: 215 },
  { pid: '47', name: 'Absolute throttle position B', short: 'Throttle B', unit: '%', bytes: 1, decode: percent, min: 0, max: 100 },
  { pid: '48', name: 'Absolute throttle position C', short: 'Throttle C', unit: '%', bytes: 1, decode: percent, min: 0, max: 100 },
  { pid: '49', name: 'Accelerator pedal position D', short: 'Pedal D', unit: '%', bytes: 1, decode: percent, min: 0, max: 100 },
  { pid: '4A', name: 'Accelerator pedal position E', short: 'Pedal E', unit: '%', bytes: 1, decode: percent, min: 0, max: 100 },
  { pid: '4B', name: 'Accelerator pedal position F', short: 'Pedal F', unit: '%', bytes: 1, decode: percent, min: 0, max: 100 },
  { pid: '4C', name: 'Commanded throttle actuator', short: 'Throttle act', unit: '%', bytes: 1, decode: percent, min: 0, max: 100 },
  { pid: '4D', name: 'Time run with MIL on', short: 'Time MIL', unit: 'min', bytes: 2, decode: u16, min: 0, max: 65535 },
  { pid: '4E', name: 'Time since codes cleared', short: 'Time clear', unit: 'min', bytes: 2, decode: u16, min: 0, max: 65535 },
  { pid: '51', name: 'Fuel type', short: 'Fuel type', unit: '', bytes: 1, decode: (b) => b[0], min: 0, max: 23,
    describe: (b) => FUEL_TYPES[b[0]] ?? `Unknown (${b[0]})` },
  { pid: '52', name: 'Ethanol fuel percentage', short: 'Ethanol', unit: '%', bytes: 1, decode: percent, min: 0, max: 100 },
  { pid: '59', name: 'Fuel rail absolute pressure', short: 'Rail abs', unit: 'kPa', bytes: 2, decode: (b) => u16(b) * 10, min: 0, max: 655350 },
  { pid: '5A', name: 'Relative accelerator pedal position', short: 'Rel pedal', unit: '%', bytes: 1, decode: percent, min: 0, max: 100 },
  { pid: '5B', name: 'Hybrid battery pack remaining life', short: 'Hybrid batt', unit: '%', bytes: 1, decode: percent, min: 0, max: 100 },
  { pid: '5C', name: 'Engine oil temperature', short: 'Oil temp', unit: '°C', bytes: 1, decode: tempC, min: -40, max: 215 },
  { pid: '5D', name: 'Fuel injection timing', short: 'Inj timing', unit: '°', bytes: 2, decode: (b) => (u16(b) - 26880) / 128, min: -210, max: 302 },
  { pid: '5E', name: 'Engine fuel rate', short: 'Fuel rate', unit: 'L/h', bytes: 2, decode: (b) => u16(b) / 20, min: 0, max: 3277 },
  { pid: '61', name: 'Driver demand engine torque', short: 'Demand trq', unit: '%', bytes: 1, decode: (b) => b[0] - 125, min: -125, max: 130 },
  { pid: '62', name: 'Actual engine torque', short: 'Actual trq', unit: '%', bytes: 1, decode: (b) => b[0] - 125, min: -125, max: 130 },
  { pid: '63', name: 'Engine reference torque', short: 'Ref trq', unit: 'N·m', bytes: 2, decode: u16, min: 0, max: 65535 },
];

/**
 * Quantity and group are derived, not authored.
 *
 * Every definition already carries its canonical unit, and the sixty-six PIDs
 * use only fifteen distinct unit strings, so tagging them by hand would be
 * sixty-six chances to introduce a typo for no added information.
 */
export const PID_DEFINITIONS: PidDefinition[] = RAW_PID_DEFINITIONS.map((definition) => ({
  ...definition,
  quantity: PID_QUANTITY_OVERRIDE[definition.pid] ?? UNIT_TO_QUANTITY[definition.unit] ?? 'none',
  group: PID_GROUPS[definition.pid] ?? 'other',
}));

const BY_PID = new Map(PID_DEFINITIONS.map((definition) => [definition.pid, definition]));

export function getPidDefinition(pid: string): PidDefinition | undefined {
  return BY_PID.get(pid.toUpperCase());
}
