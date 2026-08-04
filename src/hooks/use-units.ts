import { useCallback, useMemo } from 'react';

import { useSettings } from '@/features/settings/context/settings-provider';
import {
  convertRange,
  formatMeasurement,
  type Measurable,
  type Measurement,
  type UnitPreferences,
} from '@/lib/units';

export type Units = {
  prefs: UnitPreferences;
  format: (definition: Measurable, value: number) => Measurement;
  range: (definition: Measurable) => { min: number; max: number; unit: string };
  /** Display unit alone, for a column header or an axis caption. */
  unitOf: (definition: Measurable) => string;
};

export function useUnits(): Units {
  const { settings } = useSettings();
  const prefs = settings.units;

  const format = useCallback(
    (definition: Measurable, value: number) => formatMeasurement(definition, value, prefs),
    [prefs],
  );
  const range = useCallback((definition: Measurable) => convertRange(definition, prefs), [prefs]);
  const unitOf = useCallback(
    (definition: Measurable) => formatMeasurement(definition, 0, prefs).unit,
    [prefs],
  );

  return useMemo(() => ({ prefs, format, range, unitOf }), [prefs, format, range, unitOf]);
}
