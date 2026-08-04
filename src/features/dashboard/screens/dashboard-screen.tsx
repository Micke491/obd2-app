import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/text';
import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import { useSettings } from '@/features/settings/context/settings-provider';
import { usePidStream } from '@/hooks/use-pid-stream';
import { getPidDefinition } from '@/lib/obd/pids';
import { useThemedStyles, type Theme } from '@/theme';

import { GaugeTile } from '../components/gauge-tile';
import { PrimaryGauge } from '../components/primary-gauge';

const RPM = '0C';

export function DashboardScreen() {
  const styles = useThemedStyles(createStyles);
  const { client, supportedPids } = useObdConnection();
  const { settings } = useSettings();

  const tilePids = useMemo(
    () =>
      settings.dashboardPids.filter(
        (pid) => supportedPids.length === 0 || supportedPids.includes(pid),
      ),
    [settings.dashboardPids, supportedPids],
  );

  // Deliberately short: the fewer PIDs in the cycle, the faster each one
  // refreshes, and a dashboard is only worth reading if it keeps up.
  const streamPids = useMemo(() => [RPM, ...tilePids], [tilePids]);
  const { samples } = usePidStream(client, streamPids, {
    idleGapMs: settings.pollIntervalMs,
    queryTimeoutMs: settings.queryTimeoutMs,
  });

  const rpm = samples[RPM]?.value ?? null;
  const live = Object.keys(samples).length > 0;

  const rows = useMemo(() => {
    const pairs: string[][] = [];
    for (let i = 0; i < tilePids.length; i += 2) pairs.push(tilePids.slice(i, i + 2));
    return pairs;
  }, [tilePids]);

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Live"
        title="Dashboard"
        status={live ? 'Reading from the car now' : 'Waiting for the first reading'}
      />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.primary}>
          <PrimaryGauge rpm={rpm} />
        </View>

        <View style={styles.grid}>
          {rows.map((row) => (
            <View key={row.join('-')} style={styles.row}>
              {row.map((pid) => {
                const definition = getPidDefinition(pid);
                if (!definition) return null;
                const sample = samples[pid];
                return (
                  <GaugeTile
                    key={pid}
                    definition={definition}
                    value={sample?.value ?? null}
                    text={sample?.text ?? null}
                  />
                );
              })}
              {row.length === 1 ? <View style={styles.spacer} /> : null}
            </View>
          ))}
        </View>

        {!live ? (
          <AppText variant="caption" tone="muted" style={styles.hint}>
            Turn the ignition on, or start the engine, to see values here.
          </AppText>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    body: { gap: t.space.xl, paddingBottom: t.space.xl },
    primary: { alignItems: 'center', paddingVertical: t.space.md },
    grid: { gap: t.space.md },
    row: { flexDirection: 'row', gap: t.space.md },
    spacer: { flex: 1 },
    hint: { textAlign: 'center' },
  });
