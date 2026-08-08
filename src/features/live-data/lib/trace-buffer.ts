/**
 * The recorded history behind the graph.
 *
 * Points are appended in read order, so every array here is sorted ascending by
 * time and the readers below rely on that. Nothing in this file touches React
 * or the adapter — it is arithmetic over arrays, which is what lets the
 * self-check prove it without a car.
 */
import type { PidDefinition } from '@/lib/obd/pids';

export type TracePoint = {
  /** Epoch milliseconds, taken when the adapter answered. */
  at: number;
  /** Raw, canonical-unit value, exactly as the PID definition decoded it. */
  value: number;
};

export type TraceSeries = {
  definition: PidDefinition;
  points: TracePoint[];
};

/**
 * Points kept per PID. Three minutes is the longest window on offer and a busy
 * adapter reads a four-PID set about five times a second, so this is roughly
 * three times the headroom that needs — enough that switching to the long
 * window never shows a buffer that was quietly truncated.
 */
export const TRACE_CAPACITY = 2700;

/** Appends in place and drops the oldest points once the buffer is full. */
export function appendPoint(points: TracePoint[], point: TracePoint): void {
  points.push(point);
  if (points.length > TRACE_CAPACITY) {
    points.splice(0, points.length - TRACE_CAPACITY);
  }
}

/** The points inside a closed time window, in order. */
export function windowPoints(points: TracePoint[], from: number, to: number): TracePoint[] {
  return points.filter((point) => point.at >= from && point.at <= to);
}

export function extentOf(points: TracePoint[]): { min: TracePoint; max: TracePoint } | null {
  if (points.length === 0) return null;

  let min = points[0];
  let max = points[0];
  for (const point of points) {
    if (point.value < min.value) min = point;
    if (point.value > max.value) max = point;
  }

  return { min, max };
}

/**
 * The last reading taken at or before an instant.
 *
 * Used by the scrub cursor and by the CSV. Holding the previous value rather
 * than interpolating is the honest choice: the adapter is half-duplex and reads
 * one PID at a time, so a value between two samples is something the car never
 * reported.
 */
export function valueAt(points: TracePoint[], at: number): TracePoint | null {
  let found: TracePoint | null = null;
  for (const point of points) {
    if (point.at > at) break;
    found = point;
  }
  return found;
}

/**
 * The vertical scale to draw a series against.
 *
 * Fitting the scale to what was actually recorded is what makes the shape
 * readable: idling at 800 rpm against a 0–8000 axis is a flat line near the
 * floor, and the flatness is the very thing you are trying to judge. The floor
 * on the span — a tenth of the reading's full range — stops a steady signal
 * from being magnified into what looks like violent noise, and the axis is
 * never allowed outside the range the sensor can report.
 *
 * The legend prints the real minimum and maximum beside every line, so nothing
 * is hidden by the scale moving.
 */
export function scaleFor(
  range: { min: number; max: number },
  points: TracePoint[],
): { min: number; max: number } {
  const extent = extentOf(points);
  const full = range.max - range.min;
  if (!extent || full <= 0) return { min: range.min, max: range.max };

  const low = extent.min.value;
  const high = extent.max.value;
  const span = Math.min(full, Math.max(high - low, full * 0.1));

  const middle = (low + high) / 2;
  let min = middle - span / 2;
  let max = min + span;

  // Slide, rather than squash, when the fitted window falls off either end.
  if (min < range.min) {
    min = range.min;
    max = min + span;
  }
  if (max > range.max) {
    max = range.max;
    min = max - span;
  }

  return { min: Math.max(min, range.min), max: Math.min(max, range.max) };
}

/**
 * Thins a series to roughly `buckets` columns for drawing.
 *
 * Keeps the lowest and highest point of each time bucket rather than sampling
 * every nth point, because a diagnostic trace is read for its spikes and plain
 * stride sampling is exactly what loses them. This is what an oscilloscope does
 * when it has more samples than pixels.
 */
export function decimate(points: TracePoint[], buckets: number): TracePoint[] {
  if (buckets < 1 || points.length <= buckets * 2) return points;

  const first = points[0].at;
  const span = points[points.length - 1].at - first;
  if (span <= 0) return points;

  const out: TracePoint[] = [];
  let index = 0;
  let low = points[0];
  let high = points[0];

  const flush = () => {
    // Emitted in the order they were read, so the line never doubles back.
    if (low.at <= high.at) {
      out.push(low);
      if (high !== low) out.push(high);
    } else {
      out.push(high);
      out.push(low);
    }
  };

  for (const point of points) {
    const bucket = Math.min(buckets - 1, Math.floor(((point.at - first) / span) * buckets));

    if (bucket !== index) {
      flush();
      index = bucket;
      low = point;
      high = point;
      continue;
    }

    if (point.value < low.value) low = point;
    if (point.value > high.value) high = point;
  }

  flush();
  return out;
}
