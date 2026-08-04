import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import { usePidStream } from '@/hooks/use-pid-stream';
import { PID_DEFINITIONS, formatPidValue, type PidDefinition } from '@/lib/obd/pids';
import { TOUCH_TARGET, colors, fonts, radius, spacing } from '@/theme';

export function LiveDataScreen() {
  const { client, supportedPids } = useObdConnection();
  const [pinned, setPinned] = useState<string[]>([]);

  const available = useMemo<PidDefinition[]>(() => {
    if (supportedPids.length === 0) return PID_DEFINITIONS;
    return PID_DEFINITIONS.filter((definition) => supportedPids.includes(definition.pid));
  }, [supportedPids]);

  // Pinning narrows the cycle, and a shorter cycle means each pinned value
  // refreshes proportionally faster.
  const streamPids = useMemo(
    () => (pinned.length > 0 ? pinned : available.map((definition) => definition.pid)),
    [pinned, available],
  );

  const { samples } = usePidStream(client, streamPids);

  const togglePin = (pid: string) => {
    setPinned((prev) => (prev.includes(pid) ? prev.filter((entry) => entry !== pid) : [...prev, pid]));
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Live data</Text>
        <Text style={styles.subtitle}>
          {available.length} sensor{available.length === 1 ? '' : 's'}
          {pinned.length > 0 ? ` · ${pinned.length} pinned` : ''}
        </Text>
      </View>

      {pinned.length > 0 ? (
        <Pressable onPress={() => setPinned([])} style={styles.clearPins}>
          <Text style={styles.clearPinsText}>Show all sensors</Text>
        </Pressable>
      ) : null}

      <FlatList
        data={available}
        keyExtractor={(definition) => definition.pid}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.empty}>No sensors reported by this vehicle.</Text>}
        renderItem={({ item }) => {
          const sample = samples[item.pid];
          const isPinned = pinned.includes(item.pid);
          const display = sample
            ? (sample.text ?? formatPidValue(item, sample.value))
            : '––';

          return (
            <Pressable
              onPress={() => togglePin(item.pid)}
              style={({ pressed }) => [styles.row, isPinned && styles.rowPinned, pressed && styles.rowPressed]}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}${isPinned ? ', pinned' : ''}`}
            >
              <View style={styles.rowText}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.pid}>PID 01{item.pid}</Text>
              </View>

              <View style={styles.reading}>
                <Text style={styles.value} allowFontScaling={false} numberOfLines={1}>
                  {display}
                </Text>
                {item.unit && !sample?.text ? <Text style={styles.unit}>{item.unit}</Text> : null}
              </View>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: 2,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    fontWeight: '700',
    color: colors.readout,
  },
  subtitle: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.dim,
  },
  clearPins: {
    paddingVertical: spacing.sm,
  },
  clearPinsText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.amber,
  },
  list: {
    gap: spacing.xs,
    paddingBottom: spacing.lg,
  },
  row: {
    minHeight: TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.panel,
    borderRadius: radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  rowPinned: {
    borderLeftColor: colors.amber,
  },
  rowPressed: {
    backgroundColor: colors.panelActive,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  name: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.readout,
  },
  pid: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.dim,
  },
  reading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    maxWidth: '45%',
  },
  value: {
    fontFamily: fonts.display,
    fontSize: 22,
    fontWeight: '600',
    color: colors.readout,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.dim,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dim,
    textAlign: 'center',
    paddingVertical: spacing.xxl,
  },
});
