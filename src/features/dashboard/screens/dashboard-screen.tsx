import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import { usePidStream } from '@/hooks/use-pid-stream';
import { getPidDefinition } from '@/lib/obd/pids';
import { colors, fonts, spacing } from '@/theme';

import { GaugeTile } from '../components/gauge-tile';
import { PrimaryGauge } from '../components/primary-gauge';

const RPM = '0C';
/** Kept short so each gauge refreshes quickly; live data covers the rest. */
const TILE_PIDS = ['0D', '05', '04', '11', '0F', '42'];

export function DashboardScreen() {
  const { client, supportedPids } = useObdConnection();

  const tilePids = useMemo(
    () => TILE_PIDS.filter((pid) => supportedPids.length === 0 || supportedPids.includes(pid)),
    [supportedPids],
  );

  const streamPids = useMemo(() => [RPM, ...tilePids], [tilePids]);
  const { samples } = usePidStream(client, streamPids);

  const rpm = samples[RPM]?.value ?? null;
  const live = Object.keys(samples).length > 0;

  const rows = useMemo(() => {
    const pairs: string[][] = [];
    for (let i = 0; i < tilePids.length; i += 2) pairs.push(tilePids.slice(i, i + 2));
    return pairs;
  }, [tilePids]);

  return (
    <Screen>
      <View style={styles.status}>
        <View style={styles.statusLeft}>
          <View style={[styles.dot, { backgroundColor: live ? colors.live : colors.dim }]} />
          <Text style={styles.statusText}>{live ? 'LIVE' : 'WAITING'}</Text>
        </View>
        <Text style={styles.statusText}>DASHBOARD</Text>
      </View>

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
          <Text style={styles.hint}>Start the engine to see live values.</Text>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.dim,
  },
  body: {
    paddingVertical: spacing.lg,
    gap: spacing.xl,
  },
  primary: {
    alignItems: 'center',
  },
  grid: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  spacer: {
    flex: 1,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dim,
    textAlign: 'center',
  },
});
