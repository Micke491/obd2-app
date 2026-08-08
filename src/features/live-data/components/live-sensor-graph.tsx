import { useCallback, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { bandFor, type Band } from '@/lib/obd/thresholds';
import { gaugeFraction } from '@/lib/units';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

import {
  decimate,
  extentOf,
  scaleFor,
  valueAt,
  windowPoints,
  type TracePoint,
  type TraceSeries,
} from '../lib/trace-buffer';

export type GraphSeries = TraceSeries & { color: string };

type LiveSensorGraphProps = {
  series: GraphSeries[];
  /** Length of the visible window in milliseconds. */
  windowMs: number;
  /** Right-hand edge of the plot, epoch ms. */
  endAt: number;
  /** Instant the scrub cursor sits on, or null when following the live edge. */
  cursorAt: number | null;
  onScrub: (at: number | null) => void;
  height?: number;
};

/** Breathing room so a marker sitting at the top of the scale is not clipped. */
const PAD = 8;
/** Horizontal buckets to thin each series to. Roughly two per pixel of plot. */
const BUCKETS = 180;

const DEFAULT_HEIGHT = 200;

/**
 * A stacked strip chart: several readings, each on its own vertical scale,
 * sharing one time axis.
 *
 * Sharing the axis is the whole point — it is what lets you see that the
 * trim spiked as the throttle closed. Sharing a *vertical* scale would be
 * meaningless, since the lines carry volts, percent and rpm at once, so each
 * one is fitted to its own recorded range and the legend carries the numbers.
 */
export function LiveSensorGraph({
  series,
  windowMs,
  endAt,
  cursorAt,
  onScrub,
  height = DEFAULT_HEIGHT,
}: LiveSensorGraphProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [width, setWidth] = useState(0);

  const from = endAt - windowMs;
  const plotHeight = Math.max(height - PAD * 2, 1);

  // The responder is built once; everything it needs to convert a touch into an
  // instant changes every frame, so it reads that through a ref instead.
  const geometryRef = useRef({ width, from, windowMs });
  geometryRef.current = { width, from, windowMs };

  const scrubTo = useCallback(
    (x: number) => {
      const { width: w, from: f, windowMs: span } = geometryRef.current;
      if (w <= 0) return;
      const ratio = Math.min(1, Math.max(0, x / w));
      onScrub(f + ratio * span);
    },
    [onScrub],
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Claiming the touch on contact would stop the page from scrolling, so
        // the gesture only becomes a scrub once it is clearly sideways.
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dx) > 4 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderGrant: (event) => scrubTo(event.nativeEvent.locationX),
        onPanResponderMove: (event) => scrubTo(event.nativeEvent.locationX),
        onPanResponderRelease: () => onScrub(null),
        onPanResponderTerminate: () => onScrub(null),
      }),
    [scrubTo, onScrub],
  );

  const plotted = useMemo(() => {
    if (width <= 0) return [];

    const x = (at: number) => ((at - from) / windowMs) * width;

    return series.map((entry) => {
      const visible = windowPoints(entry.points, from, endAt);
      const scale = scaleFor(entry.definition, visible);
      const points = decimate(visible, BUCKETS);
      const y = (value: number) => PAD + (1 - gaugeFraction(scale, value)) * plotHeight;

      return {
        ...entry,
        extent: extentOf(visible),
        cursor: cursorAt === null ? null : valueAt(entry.points, cursorAt),
        paths: buildPaths(entry.definition.pid, points, x, y),
        x,
        y,
      };
    });
  }, [series, width, from, endAt, windowMs, plotHeight, cursorAt]);

  return (
    <View
      style={[styles.frame, { height }]}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      {...responder.panHandlers}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          {/* Grid: quarters of the plot, faint enough to sit behind the lines. */}
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
            <Line
              key={fraction}
              x1={0}
              x2={width}
              y1={PAD + fraction * plotHeight}
              y2={PAD + fraction * plotHeight}
              stroke={theme.color.rule}
              strokeWidth={StyleSheet.hairlineWidth}
            />
          ))}
          {[0.25, 0.5, 0.75].map((fraction) => (
            <Line
              key={`t${fraction}`}
              x1={fraction * width}
              x2={fraction * width}
              y1={PAD}
              y2={PAD + plotHeight}
              stroke={theme.color.rule}
              strokeWidth={StyleSheet.hairlineWidth}
            />
          ))}

          {plotted.map((entry) => (
            <Path
              key={`base-${entry.definition.pid}`}
              d={entry.paths.base}
              stroke={entry.color}
              strokeWidth={1.75}
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="none"
            />
          ))}

          {/* Out-of-band stretches are redrawn on top, so a brief excursion is
              visible without losing which line it belongs to. */}
          {plotted.map((entry) => (
            <Path
              key={`caution-${entry.definition.pid}`}
              d={entry.paths.caution}
              stroke={theme.color.warn}
              strokeWidth={2.75}
              strokeLinecap="round"
              fill="none"
            />
          ))}
          {plotted.map((entry) => (
            <Path
              key={`alarm-${entry.definition.pid}`}
              d={entry.paths.alarm}
              stroke={theme.color.danger}
              strokeWidth={2.75}
              strokeLinecap="round"
              fill="none"
            />
          ))}

          {/* Where each line reached its highest and lowest point in view. */}
          {plotted.map((entry) =>
            entry.extent === null
              ? null
              : (['min', 'max'] as const).map((edge) => {
                  const point = entry.extent![edge];
                  if (point.at < from || point.at > endAt) return null;
                  return (
                    <Circle
                      key={`${edge}-${entry.definition.pid}`}
                      cx={entry.x(point.at)}
                      cy={entry.y(point.value)}
                      r={2.5}
                      fill={entry.color}
                    />
                  );
                }),
          )}

          {cursorAt !== null ? (
            <>
              <Line
                x1={((cursorAt - from) / windowMs) * width}
                x2={((cursorAt - from) / windowMs) * width}
                y1={0}
                y2={height}
                stroke={theme.color.inkFaint}
                strokeWidth={1}
              />
              {plotted.map((entry) =>
                entry.cursor === null ? null : (
                  <Circle
                    key={`cursor-${entry.definition.pid}`}
                    cx={((cursorAt - from) / windowMs) * width}
                    cy={entry.y(entry.cursor.value)}
                    r={3.5}
                    fill={entry.color}
                    stroke={theme.color.ground}
                    strokeWidth={1.5}
                  />
                ),
              )}
            </>
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}

/** The worse of two bands, so a segment is judged by its unhealthier end. */
function worseBand(a: Band, b: Band): Band {
  if (a === 'alarm' || b === 'alarm') return 'alarm';
  if (a === 'caution' || b === 'caution') return 'caution';
  return 'normal';
}

/**
 * Walks a series once and produces three paths: the whole line, and the
 * stretches that left the caution and alarm bands.
 */
function buildPaths(
  pid: string,
  points: TracePoint[],
  x: (at: number) => number,
  y: (value: number) => number,
): { base: string; caution: string; alarm: string } {
  if (points.length === 0) return { base: '', caution: '', alarm: '' };

  const base: string[] = [`M${x(points[0].at).toFixed(1)} ${y(points[0].value).toFixed(1)}`];
  const caution: string[] = [];
  const alarm: string[] = [];

  // A single point still deserves a mark, so it is drawn as a zero-length line.
  if (points.length === 1) {
    base.push(`L${x(points[0].at).toFixed(1)} ${y(points[0].value).toFixed(1)}`);
  }

  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1];
    const current = points[i];
    const x0 = x(previous.at).toFixed(1);
    const y0 = y(previous.value).toFixed(1);
    const x1 = x(current.at).toFixed(1);
    const y1 = y(current.value).toFixed(1);

    base.push(`L${x1} ${y1}`);

    const band = worseBand(bandFor(pid, previous.value), bandFor(pid, current.value));
    if (band === 'alarm') alarm.push(`M${x0} ${y0}L${x1} ${y1}`);
    else if (band === 'caution') caution.push(`M${x0} ${y0}L${x1} ${y1}`);
  }

  return { base: base.join(''), caution: caution.join(''), alarm: alarm.join('') };
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    frame: {
      backgroundColor: t.color.surface,
      borderRadius: t.radius.lg,
      borderWidth: t.size.hairline,
      borderColor: t.color.rule,
      overflow: 'hidden',
    },
  });
