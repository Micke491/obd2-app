import type { Quantity } from './quantities';

export type UnitId =
  | 'degC'
  | 'degF'
  | 'kmh'
  | 'mph'
  | 'km'
  | 'mi'
  | 'kPa'
  | 'psi'
  | 'bar'
  | 'Pa'
  | 'Lph'
  | 'galUSph'
  | 'galUKph'
  | 'gps'
  | 'lbpm'
  | 'Nm'
  | 'lbft'
  | 'rpm'
  | 'deg'
  | 'sec'
  | 'min'
  | 'volt'
  | 'percent'
  | 'ratio'
  | 'count'
  | 'none';

export type UnitSpec = {
  id: UnitId;
  quantity: Quantity;
  /** What gets rendered next to the number. */
  label: string;
  toBase: (v: number) => number;
  fromBase: (v: number) => number;
  decimals?: number;
};

/**
 * Conversion factors are the defined-exact values, not rounded approximations:
 * 1 mi ≡ 1609.344 m, 1 lb ≡ 453.59237 g, 1 lbf ≡ 4.4482216152605 N,
 * 1 in ≡ 0.0254 m, 1 US gal ≡ 3.785411784 L, 1 imp gal ≡ 4.54609 L.
 */
const KM_PER_MI = 1.609344;
const MI_PER_KM = 1 / KM_PER_MI; // 0.6213711922373339
const KPA_PER_PSI = 6.894757293168361; // 4.4482216152605 N / 0.00064516 m², in kPa
const PSI_PER_KPA = 1 / KPA_PER_PSI; // 0.14503773773020923
const L_PER_GAL_US = 3.785411784;
const L_PER_GAL_UK = 4.54609;
const NM_PER_LBFT = 1.3558179483314004; // 4.4482216152605 × 0.3048
const G_PER_LB = 453.59237;

const identity = (v: number) => v;

function scaled(id: UnitId, quantity: Quantity, label: string, perBase: number, decimals?: number): UnitSpec {
  return {
    id,
    quantity,
    label,
    toBase: (v) => v / perBase,
    fromBase: (v) => v * perBase,
    decimals,
  };
}

function base(id: UnitId, quantity: Quantity, label: string, decimals?: number): UnitSpec {
  return { id, quantity, label, toBase: identity, fromBase: identity, decimals };
}

export const UNITS: Record<UnitId, UnitSpec> = {
  // temperature — base °C
  degC: base('degC', 'temperature', '°C', 0),
  degF: {
    id: 'degF',
    quantity: 'temperature',
    label: '°F',
    toBase: (v) => ((v - 32) * 5) / 9,
    fromBase: (v) => (v * 9) / 5 + 32,
    decimals: 0,
  },

  // speed — base km/h
  kmh: base('kmh', 'speed', 'km/h', 0),
  mph: scaled('mph', 'speed', 'mph', MI_PER_KM, 0),

  // distance — base km
  km: base('km', 'distance', 'km', 0),
  mi: scaled('mi', 'distance', 'mi', MI_PER_KM, 0),

  // pressure — base kPa
  kPa: base('kPa', 'pressure', 'kPa', 0),
  psi: scaled('psi', 'pressure', 'psi', PSI_PER_KPA, 1),
  bar: scaled('bar', 'pressure', 'bar', 0.01, 2),
  Pa: scaled('Pa', 'pressure', 'Pa', 1000, 0),

  // fuel rate — base L/h
  Lph: base('Lph', 'volumeRate', 'L/h', 1),
  galUSph: scaled('galUSph', 'volumeRate', 'gal/h', 1 / L_PER_GAL_US, 2),
  galUKph: scaled('galUKph', 'volumeRate', 'gal/h', 1 / L_PER_GAL_UK, 2),

  // mass flow — base g/s
  gps: base('gps', 'massFlow', 'g/s', 2),
  lbpm: scaled('lbpm', 'massFlow', 'lb/min', 60 / G_PER_LB, 2),

  // torque — base N·m
  Nm: base('Nm', 'torque', 'N·m', 0),
  lbft: scaled('lbft', 'torque', 'lb-ft', 1 / NM_PER_LBFT, 0),

  // no meaningful alternative unit
  rpm: base('rpm', 'angularSpeed', 'rpm', 0),
  deg: base('deg', 'angle', '°', 1),
  sec: base('sec', 'time', 's', 0),
  min: scaled('min', 'time', 'min', 1 / 60, 0),
  volt: base('volt', 'voltage', 'V', 2),
  percent: base('percent', 'percent', '%', 1),
  ratio: base('ratio', 'ratio', '', 3),
  count: base('count', 'count', '', 0),
  none: base('none', 'none', '', 2),
};

/** Maps a PID definition's canonical unit string onto its unit id. */
export const UNIT_BY_LABEL: Record<string, UnitId> = {
  '°C': 'degC',
  'km/h': 'kmh',
  km: 'km',
  kPa: 'kPa',
  Pa: 'Pa',
  'L/h': 'Lph',
  'g/s': 'gps',
  'N·m': 'Nm',
  rpm: 'rpm',
  '°': 'deg',
  s: 'sec',
  min: 'min',
  V: 'volt',
  '%': 'percent',
};
