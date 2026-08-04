/** What a number physically is, independent of the unit it is shown in. */
export type Quantity =
  | 'temperature'
  | 'speed'
  | 'distance'
  | 'pressure'
  | 'volumeRate'
  | 'massFlow'
  | 'torque'
  | 'angularSpeed'
  | 'angle'
  | 'time'
  | 'voltage'
  | 'percent'
  | 'ratio'
  | 'count'
  | 'none';

/**
 * Every PID definition already carries its canonical unit as a string, and
 * there are only fifteen distinct ones, so the quantity can be derived rather
 * than hand-written onto sixty-six literals.
 */
export const UNIT_TO_QUANTITY: Record<string, Quantity> = {
  '': 'none',
  '%': 'percent',
  V: 'voltage',
  '°C': 'temperature',
  kPa: 'pressure',
  Pa: 'pressure',
  km: 'distance',
  'km/h': 'speed',
  'L/h': 'volumeRate',
  'N·m': 'torque',
  'g/s': 'massFlow',
  rpm: 'angularSpeed',
  '°': 'angle',
  s: 'time',
  min: 'time',
};

/** The few PIDs whose unit string cannot tell you what the number means. */
export const PID_QUANTITY_OVERRIDE: Record<string, Quantity> = {
  // Lambda / air-fuel equivalence ratios are dimensionless but are not percentages.
  '24': 'ratio',
  '25': 'ratio',
  '26': 'ratio',
  '27': 'ratio',
  '44': 'ratio',
  // Warm-up cycles is a plain tally.
  '30': 'count',
};
