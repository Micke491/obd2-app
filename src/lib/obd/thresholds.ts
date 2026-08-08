/**
 * Safe operating bands for the readings where one can be stated honestly.
 *
 * Bounds are in each PID's *canonical* unit — the same discipline as
 * gaugeFraction in src/lib/units/format.ts. Comparing raw values means a
 * driver reading in Fahrenheit gets the same verdict as one reading in Celsius,
 * with no chance of the classic "converted the value but forgot the limit" bug.
 *
 * A PID with no entry here has no band, and bandFor returns 'normal'. That is
 * deliberate: inventing a limit is worse than having none, because a warning
 * that fires on a healthy car teaches the driver to ignore warnings.
 */
import { getPidDefinition } from './pids';

export type Band = 'normal' | 'caution' | 'alarm';

/** Bounds are inclusive: a value equal to the bound is still inside the band. */
export type ThresholdBounds = { min?: number; max?: number };

export type Threshold = {
  /** Outside this is worth noticing. */
  caution?: ThresholdBounds;
  /** Outside this is worth stopping for. */
  alarm?: ThresholdBounds;
  /** Why the limit sits where it does, in the words a driver would use. */
  note: string;
};

const TEMP_NOTE =
  'A modern engine runs at around 90 °C. Past 100 °C the coolant is close to boiling even under pressure, and past 110 °C damage starts.';

const CATALYST_NOTE =
  'A converter works at 400–800 °C. Sustained readings above that usually mean unburnt fuel is being burnt in the converter rather than in the cylinder, which destroys it.';

const TRIM_NOTE =
  'Fuel trim is how far the engine computer has to correct the fuel it was going to inject. Beyond ±10 % something is off; beyond ±20 % the correction is at the edge of what it can do and a code is likely.';

export const PID_THRESHOLDS: Record<string, Threshold> = {
  // Temperatures
  '05': { caution: { max: 100 }, alarm: { max: 110 }, note: TEMP_NOTE },
  '5C': {
    caution: { max: 125 },
    alarm: { max: 140 },
    note: 'Engine oil thins as it heats. Above about 125 °C it stops protecting bearings properly.',
  },
  '0F': {
    caution: { max: 70 },
    note: 'Intake air much hotter than the day itself usually means heat soak or a leak drawing air from beside the exhaust, which costs power.',
  },

  // Catalyst temperatures, both banks, both sensor positions
  '3C': { caution: { max: 800 }, alarm: { max: 900 }, note: CATALYST_NOTE },
  '3D': { caution: { max: 800 }, alarm: { max: 900 }, note: CATALYST_NOTE },
  '3E': { caution: { max: 800 }, alarm: { max: 900 }, note: CATALYST_NOTE },
  '3F': { caution: { max: 800 }, alarm: { max: 900 }, note: CATALYST_NOTE },

  // Fuel trims, short and long term, both banks
  '06': { caution: { min: -10, max: 10 }, alarm: { min: -20, max: 20 }, note: TRIM_NOTE },
  '07': { caution: { min: -10, max: 10 }, alarm: { min: -20, max: 20 }, note: TRIM_NOTE },
  '08': { caution: { min: -10, max: 10 }, alarm: { min: -20, max: 20 }, note: TRIM_NOTE },
  '09': { caution: { min: -10, max: 10 }, alarm: { min: -20, max: 20 }, note: TRIM_NOTE },

  // Electrical
  '42': {
    caution: { min: 12.0, max: 14.8 },
    alarm: { min: 11.5, max: 15.0 },
    note: 'With the engine running the alternator should hold 13.5–14.5 V. Below 12 V it is not charging; above 15 V the regulator is overcharging and will boil the battery.',
  },
};

/*
 * Oxygen sensor voltage (PIDs 14–1B) is deliberately absent.
 *
 * A healthy narrowband sensor swings across almost its whole range about once a
 * second, and pins near zero for seconds at a time on every overrun fuel
 * cut-off. Any band drawn around a single sample would therefore fire
 * constantly on a car with nothing wrong with it. What actually diagnoses an
 * oxygen sensor is the shape over time — how fast it crosses, and whether it
 * still reaches both ends — which is exactly what the graph shows and what no
 * threshold can say.
 */

function outside(bounds: ThresholdBounds | undefined, value: number): boolean {
  if (!bounds) return false;
  if (bounds.min !== undefined && value < bounds.min) return true;
  if (bounds.max !== undefined && value > bounds.max) return true;
  return false;
}

/** Which band a raw, canonical-unit reading falls in. */
export function bandFor(pid: string, value: number): Band {
  const threshold = PID_THRESHOLDS[pid.toUpperCase()];
  if (!threshold || !Number.isFinite(value)) return 'normal';

  if (outside(threshold.alarm, value)) return 'alarm';
  if (outside(threshold.caution, value)) return 'caution';
  return 'normal';
}

/**
 * A word for the band, so colour never carries the meaning on its own.
 * Null when the reading is where it should be.
 */
export function describeBand(pid: string, value: number): string | null {
  const band = bandFor(pid, value);
  if (band === 'normal') return null;

  const threshold = PID_THRESHOLDS[pid.toUpperCase()];
  const bounds = band === 'alarm' ? threshold?.alarm : threshold?.caution;
  const low = bounds?.min !== undefined && value < bounds.min;

  if (band === 'alarm') return low ? 'Very low' : 'Very high';
  return low ? 'Low' : 'High';
}

/** The plain-language reason behind a PID's limits, for the detail line. */
export function thresholdNote(pid: string): string | null {
  return PID_THRESHOLDS[pid.toUpperCase()]?.note ?? null;
}

/** Every PID that has a band, for the self-check and for listing them. */
export function thresholdPids(): string[] {
  return Object.keys(PID_THRESHOLDS).filter((pid) => getPidDefinition(pid) !== undefined);
}
