/**
 * Turns a recorded trace into a spreadsheet.
 *
 * Kept free of file and share APIs so the shape of the output can be checked
 * without a device — see trace-export.ts for the part that touches the disk.
 */
import { convertRange, formatMeasurement, type UnitPreferences } from '@/lib/units';

import { valueAt, type TraceSeries } from './trace-buffer';

/** Quotes a field only when it would otherwise break the row. */
function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function columnLabel(series: TraceSeries, prefs: UnitPreferences): string {
  const { unit } = convertRange(series.definition, prefs);
  return unit ? `${series.definition.name} (${unit})` : series.definition.name;
}

/**
 * One row per instant any sensor was read, one column per sensor.
 *
 * Every cell holds the last value read at or before that row's time rather than
 * an interpolated one. The adapter answers one PID at a time, so the readings
 * on a row were never simultaneous, and a smoothed number would be a reading
 * the car never gave. A cell is empty only before that sensor's first answer.
 *
 * Values are converted with the same code the screen uses, so the file and the
 * graph never disagree about what was measured.
 */
export function buildTraceCsv(series: TraceSeries[], prefs: UnitPreferences): string {
  const present = series.filter((entry) => entry.points.length > 0);
  if (present.length === 0) return '';

  const instants = [...new Set(present.flatMap((entry) => entry.points.map((p) => p.at)))].sort(
    (a, b) => a - b,
  );
  const start = instants[0];

  const header = ['time_iso', 'elapsed_s', ...present.map((entry) => columnLabel(entry, prefs))];
  const rows = [header.map(csvField).join(',')];

  for (const at of instants) {
    const cells = [
      new Date(at).toISOString(),
      ((at - start) / 1000).toFixed(3),
      ...present.map((entry) => {
        const point = valueAt(entry.points, at);
        return point === null ? '' : formatMeasurement(entry.definition, point.value, prefs).text;
      }),
    ];
    rows.push(cells.map(csvField).join(','));
  }

  // A trailing newline: some spreadsheet importers drop the last row without it.
  return `${rows.join('\r\n')}\r\n`;
}

/** A filename that sorts chronologically and survives every filesystem. */
export function traceFilename(at: number = Date.now()): string {
  const stamp = new Date(at).toISOString().replace(/[:.]/g, '-').replace(/Z$/, '');
  return `scanner-trace-${stamp}.csv`;
}
