import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { Segmented } from '@/components/segmented';
import { AppText } from '@/components/text';
import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import { useSettings } from '@/features/settings/context/settings-provider';
import { usePidStream } from '@/hooks/use-pid-stream';
import { useUnits } from '@/hooks/use-units';
import { getPidDefinition, type PidDefinition } from '@/lib/obd/pids';
import { bandFor, describeBand } from '@/lib/obd/thresholds';
import { NO_VALUE } from '@/lib/units';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

import { LiveSensorGraph, type GraphSeries } from '../components/live-sensor-graph';
import { usePidTrace } from '../hooks/use-pid-trace';
import { extentOf, valueAt, windowPoints, type TracePoint } from '../lib/trace-buffer';
import { buildTraceCsv } from '../lib/trace-csv';
import { shareTraceCsv } from '../lib/trace-export';
import { availableGroups } from '../lib/trace-groups';

/** Time bases, in the manner of an oscilloscope rather than a free zoom. */
const WINDOWS = [
  { value: '15000', label: '15 s' },
  { value: '60000', label: '60 s' },
  { value: '180000', label: '3 min' },
] as const;

const DEFAULT_WINDOW = '60000';

export function LiveGraphScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { client, supportedPids } = useObdConnection();
  const { settings } = useSettings();
  const { prefs } = useUnits();

  const groups = useMemo(() => availableGroups(supportedPids), [supportedPids]);
  const [groupId, setGroupId] = useState<string>(groups[0]?.id ?? '');
  // Falling back rather than correcting through an effect: supported PIDs
  // arrive after the first render, and a group can vanish when they do.
  const group = groups.find((entry) => entry.id === groupId) ?? groups[0] ?? null;

  const [windowValue, setWindowValue] = useState<string>(DEFAULT_WINDOW);
  const windowMs = Number(windowValue);

  const [cursorAt, setCursorAt] = useState<number | null>(null);
  const [frozenEnd, setFrozenEnd] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const pids = useMemo(() => group?.pids ?? [], [group]);
  const { record, traces, revision, latestAt, clear } = usePidTrace(pids);

  usePidStream(client, pids, {
    idleGapMs: settings.pollIntervalMs,
    queryTimeoutMs: settings.queryTimeoutMs,
    onSample: record,
  });

  // The window is anchored to the clock so an adapter that stops answering
  // leaves a visible gap. It is pinned while scrubbing, so the cursor does not
  // slide out from under the finger holding it.
  const endAt = frozenEnd ?? Date.now();

  const handleScrub = useCallback((at: number | null) => {
    if (at === null) {
      setCursorAt(null);
      setFrozenEnd(null);
      return;
    }
    setCursorAt(at);
    setFrozenEnd((previous) => previous ?? Date.now());
  }, []);

  const series = useMemo<GraphSeries[]>(() => {
    const palette = [theme.color.accent, theme.color.sevMinor, theme.color.ok, theme.color.ink];

    return pids.flatMap((pid, index) => {
      const definition = getPidDefinition(pid);
      if (!definition) return [];
      return [{ definition, points: traces[pid] ?? [], color: palette[index % palette.length] }];
    });
    // `traces` is a stable ref object, so the revision counter is what says the
    // contents moved.
  }, [pids, traces, revision, theme]);

  const recorded = latestAt !== null;

  const onExport = useCallback(async () => {
    setExporting(true);
    setNotice(null);
    const result = await shareTraceCsv(buildTraceCsv(series, prefs));
    setNotice(result.ok ? `Exported ${result.name}` : result.reason);
    setExporting(false);
  }, [series, prefs]);

  const onClear = useCallback(() => {
    clear();
    setCursorAt(null);
    setFrozenEnd(null);
    setNotice(null);
  }, [clear]);

  if (group === null) {
    return (
      <Screen>
        <ScreenHeader eyebrow="Live" title="Graph" />
        <EmptyState
          icon="chart-timeline-variant"
          title="Nothing to graph"
          body="This car does not report any of the readings these graphs are built from. The All sensors screen will show what it does report."
        />
      </Screen>
    );
  }

  const windowLabel = WINDOWS.find((entry) => entry.value === windowValue)?.label ?? '';

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Live"
        title="Graph"
        status={
          recorded
            ? `${pids.length} sensor${pids.length === 1 ? '' : 's'} · ${windowLabel} window`
            : 'Waiting for the first reading'
        }
      />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Segmented
          options={groups.map((entry) => ({ value: entry.id, label: entry.label }))}
          value={group.id}
          onChange={setGroupId}
        />

        <AppText variant="caption" tone="muted">
          {group.hint}
        </AppText>

        <View style={styles.plot}>
          <LiveSensorGraph
            series={series}
            windowMs={windowMs}
            endAt={endAt}
            cursorAt={cursorAt}
            onScrub={handleScrub}
          />

          <View style={styles.axis}>
            <AppText variant="caption" tone="faint">
              −{windowLabel}
            </AppText>
            <AppText variant="caption" tone="faint">
              {cursorAt === null
                ? 'Drag across to read a moment'
                : `−${((endAt - cursorAt) / 1000).toFixed(1)} s`}
            </AppText>
            <AppText variant="caption" tone="faint">
              now
            </AppText>
          </View>
        </View>

        <Segmented
          options={WINDOWS.map((entry) => ({ value: entry.value, label: entry.label }))}
          value={windowValue}
          onChange={setWindowValue}
        />

        <View style={styles.legend}>
          {series.map((entry) => (
            <LegendRow
              key={entry.definition.pid}
              definition={entry.definition}
              color={entry.color}
              points={entry.points}
              from={endAt - windowMs}
              to={endAt}
              cursorAt={cursorAt}
            />
          ))}
        </View>

        {notice ? (
          <AppText variant="caption" tone="muted">
            {notice}
          </AppText>
        ) : null}

        <AppText variant="caption" tone="faint">
          Readings are taken one at a time, so the lines share a clock rather than a single instant.
          Three minutes are kept; anything older is discarded.
        </AppText>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerButton}>
          <Button
            label="Export CSV"
            onPress={() => void onExport()}
            variant="secondary"
            icon="tray-arrow-up"
            disabled={!recorded}
            busy={exporting}
          />
        </View>
        <View style={styles.footerButton}>
          <Button
            label="Clear"
            onPress={onClear}
            variant="ghost"
            icon="broom"
            disabled={!recorded}
          />
        </View>
      </View>
    </Screen>
  );
}

/**
 * One line's readout: what it is doing now (or under the cursor), and how far
 * it travelled inside the visible window.
 */
function LegendRow({
  definition,
  color,
  points,
  from,
  to,
  cursorAt,
}: {
  definition: PidDefinition;
  color: string;
  points: TracePoint[];
  from: number;
  to: number;
  cursorAt: number | null;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { format } = useUnits();

  const point = cursorAt === null ? (points[points.length - 1] ?? null) : valueAt(points, cursorAt);
  const extent = extentOf(windowPoints(points, from, to));

  const measurement = point === null ? null : format(definition, point.value);
  const band = point === null ? 'normal' : bandFor(definition.pid, point.value);
  const word = point === null ? null : describeBand(definition.pid, point.value);

  const tint =
    band === 'alarm' ? theme.color.danger : band === 'caution' ? theme.color.warn : theme.color.ink;

  return (
    <View style={styles.legendRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />

      <View style={styles.legendText}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {definition.short}
        </AppText>
        <AppText variant="caption" tone="faint" numberOfLines={1}>
          {extent
            ? `${format(definition, extent.min.value).text} – ${format(definition, extent.max.value).text} in view`
            : 'No readings yet'}
        </AppText>
      </View>

      <View style={styles.legendValue}>
        <AppText style={[styles.value, { color: tint }]} numberOfLines={1}>
          {measurement?.text ?? NO_VALUE}
          {measurement?.unit ? <AppText variant="caption" tone="faint"> {measurement.unit}</AppText> : null}
        </AppText>
        {word ? (
          <AppText variant="eyebrow" style={{ color: tint }}>
            {word}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    body: { gap: t.space.md, paddingBottom: t.space.xl },
    plot: { gap: t.space.xs },
    axis: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    legend: { gap: t.space.xs, paddingTop: t.space.xs },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space.md,
      paddingVertical: t.space.sm,
      borderBottomWidth: t.size.hairline,
      borderBottomColor: t.color.rule,
    },
    dot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { flex: 1, gap: 1 },
    legendValue: { alignItems: 'flex-end', gap: 1 },
    value: {
      fontFamily: t.font.displayBold,
      fontSize: 20,
      lineHeight: 24,
      fontVariant: ['tabular-nums'],
    },
    footer: { flexDirection: 'row', gap: t.space.sm, paddingVertical: t.space.md },
    footerButton: { flex: 1 },
  });
