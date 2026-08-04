import type { Quantity } from './quantities';
import type { UnitId } from './registry';

export type UnitSystem = 'metric' | 'imperial' | 'us' | 'custom';

export type UnitPreferences = {
  system: UnitSystem;
  temperature: 'degC' | 'degF';
  speed: 'kmh' | 'mph';
  distance: 'km' | 'mi';
  pressure: 'kPa' | 'psi' | 'bar';
  /** Also drives fuel rate and mass air flow. */
  volume: 'L' | 'galUS' | 'galUK';
  torque: 'Nm' | 'lbft';
};

export type UnitChoices = Omit<UnitPreferences, 'system'>;

export const UNIT_PRESETS: Record<Exclude<UnitSystem, 'custom'>, UnitChoices> = {
  metric: { temperature: 'degC', speed: 'kmh', distance: 'km', pressure: 'kPa', volume: 'L', torque: 'Nm' },
  imperial: { temperature: 'degC', speed: 'mph', distance: 'mi', pressure: 'psi', volume: 'galUK', torque: 'lbft' },
  us: { temperature: 'degF', speed: 'mph', distance: 'mi', pressure: 'psi', volume: 'galUS', torque: 'lbft' },
};

export const DEFAULT_UNITS: UnitPreferences = { system: 'metric', ...UNIT_PRESETS.metric };

/** True when every category already matches the preset, so "custom" is honest. */
export function matchesPreset(prefs: UnitChoices, system: Exclude<UnitSystem, 'custom'>): boolean {
  const preset = UNIT_PRESETS[system];
  return (Object.keys(preset) as (keyof UnitChoices)[]).every((key) => preset[key] === prefs[key]);
}

export function detectSystem(prefs: UnitChoices): UnitSystem {
  if (matchesPreset(prefs, 'metric')) return 'metric';
  if (matchesPreset(prefs, 'us')) return 'us';
  if (matchesPreset(prefs, 'imperial')) return 'imperial';
  return 'custom';
}

/**
 * Picks the display unit for a reading.
 *
 * Where the preference is the metric option the PID's own canonical unit wins,
 * so a value the ECU reports in Pa keeps being shown in Pa rather than being
 * rewritten as 8.192 kPa for no reason.
 */
export function resolveUnit(quantity: Quantity, source: UnitId, prefs: UnitPreferences): UnitId {
  switch (quantity) {
    case 'temperature':
      return prefs.temperature;
    case 'speed':
      return prefs.speed;
    case 'distance':
      return prefs.distance;
    case 'pressure':
      return prefs.pressure === 'kPa' ? source : prefs.pressure;
    case 'volumeRate':
      if (prefs.volume === 'L') return source;
      return prefs.volume === 'galUS' ? 'galUSph' : 'galUKph';
    case 'massFlow':
      return prefs.volume === 'L' ? source : 'lbpm';
    case 'torque':
      return prefs.torque === 'Nm' ? source : 'lbft';
    default:
      return source;
  }
}

export const UNIT_CATEGORY_LABELS: Record<keyof UnitChoices, string> = {
  temperature: 'Temperature',
  speed: 'Speed',
  distance: 'Distance',
  pressure: 'Pressure',
  volume: 'Fuel volume',
  torque: 'Torque',
};

export const UNIT_OPTION_LABELS: Record<string, string> = {
  degC: 'Celsius (°C)',
  degF: 'Fahrenheit (°F)',
  kmh: 'Kilometres per hour',
  mph: 'Miles per hour',
  km: 'Kilometres',
  mi: 'Miles',
  kPa: 'Kilopascal (kPa)',
  psi: 'Pounds per sq inch (psi)',
  bar: 'Bar',
  L: 'Litres',
  galUS: 'US gallons',
  galUK: 'Imperial gallons',
  Nm: 'Newton-metres (N·m)',
  lbft: 'Pound-feet (lb-ft)',
};

export const UNIT_CATEGORY_OPTIONS: { [K in keyof UnitChoices]: UnitChoices[K][] } = {
  temperature: ['degC', 'degF'],
  speed: ['kmh', 'mph'],
  distance: ['km', 'mi'],
  pressure: ['kPa', 'psi', 'bar'],
  volume: ['L', 'galUS', 'galUK'],
  torque: ['Nm', 'lbft'],
};
