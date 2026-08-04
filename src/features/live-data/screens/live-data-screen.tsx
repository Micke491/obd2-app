import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
import { getPidDefinition, type PidDefinition } from '@/lib/obd/pids';
import { NO_VALUE, gaugeFraction } from '@/lib/units';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

/**
 * The working set: a small, user-chosen list shown large and refreshed fast.
 *
 * Browsing every sensor is the All sensors screen's job. Keeping these two
 * apart is what lets this one poll a handful of PIDs several times a second
 * instead of crawling round sixty.
 */
export function LiveDataScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { client, supportedPids } = useObdConnection();
  const { settings, update } = useSettings();

  const pinned = useMemo(
    () =>
      settings.pinnedPids.filter(
        (pid) => getPidDefinition(pid) && (supportedPids.length === 0 || supportedPids.includes(pid)),
      ),
    [settings.pinnedPids, supportedPids],
  );

  const { samples, cycles } = usePidStream(client, pinned, {
    idleGapMs: settings.pollIntervalMs,
    queryTimeoutMs: settings.queryTimeoutMs,
  });

  const unpin = useCallback(
    (pid: string) => update({ pinnedPids: settings.pinnedPids.filter((entry) => entry !== pid) }),
    [settings.pinnedPids, update],
  );

  const rate = pinned.length > 0 && cycles > 0 ? `${pinned.length} sensors · ${cycles} passes` : null;

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Live"
        title="Live data"
        status={pinned.length === 0 ? 'Nothing chosen yet' : (rate ?? 'Starting…')}
      />

      {pinned.length === 0 ? (
        <EmptyState
          icon="playlist-plus"
          title="No sensors chosen"
          body="Pick the readings you want to watch and they will appear here, updating as fast as the adapter allows."
          action={{ label: 'Browse all sensors', onPress: () => router.push('/sensors') }}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {pinned.map((pid) => {
            const definition = getPidDefinition(pid);
            if (!definition) return null;
            return (
              <LiveRow
                key={pid}
                definition={definition}
                sample={samples[pid]}
                onRemove={() => unpin(pid)}
              />
            );
          })}

          <Pressable
            onPress={() => router.push('/sensors')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.addRow, pressed && styles.addRowPressed]}
          >
            <MaterialCommunityIcons name="plus" size={18} color={theme.color.accentInk} />
            <AppText variant="bodyStrong" tone="accent">
              Add a sensor
            </AppText>
          </Pressable>
        </ScrollView>
      )}
    </Screen>
  );
}

function LiveRow({
  definition,
  sample,
  onRemove,
}: {
  definition: PidDefinition;
  sample: PidSample | undefined;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { format } = useUnits();

  const value = sample?.value ?? null;
  const measurement = value === null ? null : format(definition, value);
  const display = sample?.text ?? measurement?.text ?? NO_VALUE;

  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {definition.name}
        </AppText>
        <AppText variant="caption" tone="faint">
          PID 01{definition.pid}
        </AppText>
      </View>

      <View style={styles.rowValue}>
        <View style={styles.valueLine}>
          <AppText style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
            {display}
          </AppText>
          {!sample?.text && measurement?.unit ? (
            <AppText variant="caption" tone="faint">
              {measurement.unit}
            </AppText>
          ) : null}
        </View>
        <Meter fraction={gaugeFraction(definition, value)} height={3} />
      </View>

      <Pressable
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${definition.name}`}
        hitSlop={10}
        style={styles.remove}
      >
        <MaterialCommunityIcons name="close" size={18} color={theme.color.inkFaint} />
      </Pressable>
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    body: { gap: t.space.sm, paddingBottom: t.space.xxxl },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space.md,
      padding: t.space.lg,
      backgroundColor: t.color.surface,
      borderRadius: t.radius.lg,
      borderWidth: t.size.hairline,
      borderColor: t.color.rule,
    },
    rowText: { flex: 1, gap: 1 },
    rowValue: { width: 118, gap: t.space.xs },
    valueLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end', gap: t.space.xs },
    value: {
      fontFamily: t.font.displayBold,
      fontSize: 24,
      lineHeight: 28,
      color: t.color.ink,
      fontVariant: ['tabular-nums'],
    },
    remove: { padding: t.space.xs },
    addRow: {
      minHeight: t.size.touch,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: t.space.sm,
      borderRadius: t.radius.lg,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: t.color.ruleStrong,
    },
    addRowPressed: { backgroundColor: t.color.surfaceSunken },
  });
