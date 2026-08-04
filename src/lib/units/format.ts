import type { Quantity } from './quantities';
import { UNITS, UNIT_BY_LABEL, type UnitId } from './registry';
import { resolveUnit, type UnitPreferences } from './preferences';

/** The subset of a PID definition the units layer needs. */
export type Measurable = {
  unit: string;
  quantity?: Quantity;
  decimals?: number;
  min?: number;
  max?: number;
};

export type Measurement = {
  /** Converted numeric value, for anything that needs to compare or sort. */
  value: number;
  /** Display label, empty for dimensionless readings. */
  unit: string;
  /** Rounded number as text, without the unit. */
  text: string;
  /** `text` and `unit` joined, collapsed when there is no unit. */
  full: string;
};

export const NO_VALUE = '––';

function sourceUnit(definition: Measurable): UnitId {
  return UNIT_BY_LABEL[definition.unit] ?? 'none';
}

/** Rounds to a sensible number of decimals for the magnitude involved. */
function decimalsFor(definition: Measurable, spec: { decimals?: number }, value: number): number {
  if (definition.decimals !== undefined) return definition.decimals;
  if (spec.decimals !== undefined) return spec.decimals;
  const abs = Math.abs(value);
  if (abs >= 100) return 0;
  if (abs >= 10) return 1;
  return 2;
}

export function formatMeasurement(
  definition: Measurable,
  value: number,
  prefs: UnitPreferences,
): Measurement {
  const source = sourceUnit(definition);
  const quantity = definition.quantity ?? UNITS[source].quantity;
  const target = resolveUnit(quantity, source, prefs);
  const spec = UNITS[target];

  // Converting through the base is a no-op when source and target agree, which
  // is the common case, so it costs nothing to always go the same way.
  const converted = target === source ? value : spec.fromBase(UNITS[source].toBase(value));
  const places = decimalsFor(definition, spec, converted);

  // Rounding must be unconditional: °C→°F turns a whole number into 203.00000001,
  // so there is no such thing as an "already integral" reading after conversion.
  const rounded = Number.parseFloat(converted.toFixed(places));
  const text = rounded.toFixed(places);

  return {
    value: rounded,
    unit: spec.label,
    text,
    full: spec.label ? `${text} ${spec.label}` : text,
  };
}

/** Converted scale endpoints, for axis labels and tick marks — never geometry. */
export function convertRange(
  definition: Measurable,
  prefs: UnitPreferences,
): { min: number; max: number; unit: string } {
  const source = sourceUnit(definition);
  const quantity = definition.quantity ?? UNITS[source].quantity;
  const target = resolveUnit(quantity, source, prefs);
  const spec = UNITS[target];
  const convert = (v: number) => (target === source ? v : spec.fromBase(UNITS[source].toBase(v)));

  return {
    min: convert(definition.min ?? 0),
    max: convert(definition.max ?? 100),
    unit: spec.label,
  };
}

/**
 * Position of a reading within its range, 0–1.
 *
 * Deliberately takes the raw canonical value and the raw min/max. Every
 * conversion here is affine, and (v − min) / (max − min) is invariant under an
 * affine transform — both the offset and the scale cancel — so converting first
 * would be work that can only introduce the classic "converted the value but
 * forgot the range" bug.
 */
export function gaugeFraction(range: { min: number; max: number }, rawValue: number | null): number {
  if (rawValue === null || !Number.isFinite(rawValue)) return 0;
  const span = range.max - range.min;
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (rawValue - range.min) / span));
}
