import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, TextInput, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { EmptyState } from '@/components/empty-state';
import { Meter } from '@/components/meter';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/text';
import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import { useSettings } from '@/features/settings/context/settings-provider';
import { usePidStream, type PidSample } from '@/hooks/use-pid-stream';
import { useUnits } from '@/hooks/use-units';
import { PID_GROUP_LABELS, PID_GROUP_ORDER, type PidGroup } from '@/lib/obd/pid-groups';
import { PID_DEFINITIONS, type PidDefinition } from '@/lib/obd/pids';
import { NO_VALUE, gaugeFraction } from '@/lib/units';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

import { useVisiblePids } from '../hooks/use-visible-pids';

/** Beyond this a value is stale enough to say so rather than quietly imply it. */
const STALE_AFTER_MS = 2500;

type Row = PidDefinition & { supported: boolean };

export function AllSensorsScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { client, supportedPids } = useObdConnection();
  const { settings, update } = useSettings();

  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const sections = useMemo(() => {
    const supported = new Set(supportedPids);
    // An empty support list means discovery failed, not that nothing works.
    const knowSupport = supportedPids.length > 0;
    const needle = deferredQuery.trim().toLowerCase();

    const rows: Row[] = PID_DEFINITIONS.map((definition) => ({
      ...definition,
      supported: !knowSupport || supported.has(definition.pid),
    }))
      .filter((row) => row.supported || settings.showUnsupportedSensors)
      .filter((row) => {
        if (!needle) return true;
        return (
          row.name.toLowerCase().includes(needle) ||
          row.short.toLowerCase().includes(needle) ||
          row.pid.toLowerCase().includes(needle) ||
          PID_GROUP_LABELS[row.group].toLowerCase().includes(needle)
        );
      });

    const byGroup = new Map<PidGroup, Row[]>();
    for (const row of rows) {
      const list = byGroup.get(row.group) ?? [];
      list.push(row);
      byGroup.set(row.group, list);
    }

    return PID_GROUP_ORDER.filter((group) => byGroup.has(group)).map((group) => ({
      title: PID_GROUP_LABELS[group],
      data: (byGroup.get(group) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [deferredQuery, settings.showUnsupportedSensors, supportedPids]);

  const { visible, onViewableItemsChanged, viewabilityConfig } = useVisiblePids();

  const { samples } = usePidStream(client, visible, {
    idleGapMs: settings.pollIntervalMs,
    queryTimeoutMs: settings.queryTimeoutMs,
  });

  const togglePin = useCallback(
    (pid: string) => {
      const pinned = settings.pinnedPids.includes(pid)
        ? settings.pinnedPids.filter((entry) => entry !== pid)
        : [...settings.pinnedPids, pid];
      update({ pinnedPids: pinned });
    },
    [settings.pinnedPids, update],
  );

  const total = sections.reduce((sum, section) => sum + section.data.length, 0);

  return (
    <Screen flush>
      <View style={styles.head}>
        <ScreenHeader
          eyebrow="Reference"
          title="All sensors"
          status={
            supportedPids.length > 0
              ? `${supportedPids.length} supported by this car`
              : 'Showing every standard sensor'
          }
        />

        <View style={styles.search}>
          <MaterialCommunityIcons name="magnify" size={18} color={theme.color.inkFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search sensors"
            placeholderTextColor={theme.color.inkFaint}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel="Search sensors"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
              <MaterialCommunityIcons name="close-circle" size={18} color={theme.color.inkFaint} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.pid}
        stickySectionHeadersEnabled
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        keyboardShouldPersistTaps="handled"
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <AppText variant="eyebrow" tone="accent">
              {section.title}
            </AppText>
            <AppText variant="eyebrow" tone="faint">
              {section.data.length}
            </AppText>
          </View>
        )}
        renderItem={({ item }) => (
          <SensorRow
            row={item}
            sample={samples[item.pid]}
            pinned={settings.pinnedPids.includes(item.pid)}
            onTogglePin={() => togglePin(item.pid)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="magnify-close"
            title="No sensor matches that"
            body={
              query
                ? `Nothing here is called “${query}”. Try a shorter word, or the PID number.`
                : 'This car did not report any supported sensors. Turn Show unsupported on in Settings to browse the full standard list.'
            }
          />
        }
        ListFooterComponent={
          total > 0 ? (
            <AppText variant="caption" tone="faint" style={styles.footer}>
              Only the sensors on screen are being read, so the ones you are looking at stay
              responsive. Tap the pin to add a sensor to Live data.
            </AppText>
          ) : null
        }
      />
    </Screen>
  );
}

function SensorRow({
  row,
  sample,
  pinned,
  onTogglePin,
}: {
  row: Row;
  sample: PidSample | undefined;
  pinned: boolean;
  onTogglePin: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { format } = useUnits();

  const value = sample?.value ?? null;
  const measurement = value === null ? null : format(row, value);
  const display = sample?.text ?? measurement?.text ?? NO_VALUE;
  // A row that has scrolled out of the poll set keeps its last reading rather
  // than blanking, but it is dimmed so it does not pass for a live one.
  const stale = sample !== undefined && Date.now() - sample.at > STALE_AFTER_MS;

  return (
    <View style={[styles.row, !row.supported && styles.rowUnsupported]}>
      <View style={styles.rowText}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {row.name}
        </AppText>
        <AppText variant="caption" tone="faint">
          PID 01{row.pid}
          {row.supported ? '' : ' · not supported'}
        </AppText>
      </View>

      <View style={styles.rowValue}>
        <View style={styles.valueLine}>
          <AppText style={[styles.value, stale && styles.valueStale]} numberOfLines={1}>
            {display}
          </AppText>
          {!sample?.text && measurement?.unit ? (
            <AppText variant="caption" tone="faint">
              {measurement.unit}
            </AppText>
          ) : null}
        </View>
        <Meter fraction={gaugeFraction(row, value)} height={3} />
      </View>

      <Pressable
        onPress={onTogglePin}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityState={{ selected: pinned }}
        accessibilityLabel={pinned ? `Remove ${row.name} from Live data` : `Add ${row.name} to Live data`}
        style={styles.pin}
      >
        <MaterialCommunityIcons
          name={pinned ? 'pin' : 'pin-outline'}
          size={18}
          color={pinned ? theme.color.accentInk : theme.color.inkFaint}
        />
      </Pressable>
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    head: { paddingHorizontal: t.space.lg, gap: t.space.md, paddingBottom: t.space.md },
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space.sm,
      paddingHorizontal: t.space.md,
      height: 44,
      borderRadius: t.radius.md,
      backgroundColor: t.color.surface,
      borderWidth: t.size.hairline,
      borderColor: t.color.rule,
    },
    searchInput: {
      flex: 1,
      fontFamily: t.font.body,
      fontSize: 15,
      color: t.color.ink,
      padding: 0,
    },
    list: { paddingHorizontal: t.space.lg, paddingBottom: t.space.xxxl },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: t.space.lg,
      paddingBottom: t.space.sm,
      backgroundColor: t.color.ground,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space.md,
      paddingVertical: t.space.md,
      borderBottomWidth: t.size.hairline,
      borderBottomColor: t.color.rule,
    },
    rowUnsupported: { opacity: 0.45 },
    rowText: { flex: 1, gap: 1 },
    rowValue: { width: 96, gap: t.space.xs },
    valueLine: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'flex-end',
      gap: t.space.xs,
    },
    value: {
      fontFamily: t.font.displayBold,
      fontSize: 19,
      lineHeight: 23,
      color: t.color.ink,
      fontVariant: ['tabular-nums'],
    },
    valueStale: { color: t.color.inkFaint },
    pin: { padding: t.space.xs },
    footer: { paddingTop: t.space.xl, textAlign: 'center' },
  });
