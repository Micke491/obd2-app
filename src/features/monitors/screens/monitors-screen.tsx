import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import {
  parseMonitorTests,
  parseReadiness,
  type MonitorState,
  type MonitorTest,
  type ReadinessStatus,
} from '@/lib/obd/monitors';
import { colors, fonts, radius, spacing } from '@/theme';

const STATE_COLOR: Record<MonitorState, string> = {
  complete: colors.live,
  incomplete: colors.amber,
  unsupported: colors.dim,
};

const STATE_LABEL: Record<MonitorState, string> = {
  complete: 'Ready',
  incomplete: 'Not ready',
  unsupported: 'N/A',
};

export function MonitorsScreen() {
  const { client } = useObdConnection();
  const [readiness, setReadiness] = useState<ReadinessStatus | null>(null);
  const [tests, setTests] = useState<MonitorTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode06Supported, setMode06Supported] = useState(true);

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);

    try {
      const status = await client.query('0101', 4000);
      setReadiness(status.ok ? parseReadiness(status.hex) : null);
    } catch {
      setReadiness(null);
    }

    try {
      const results = await client.query('0600', 6000);
      if (results.ok) {
        const parsed = parseMonitorTests(results.hex);
        setTests(parsed);
        setMode06Supported(true);
      } else {
        setTests([]);
        setMode06Supported(false);
      }
    } catch {
      setTests([]);
      setMode06Supported(false);
    }

    setLoading(false);
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Monitors</Text>
        <Text style={styles.subtitle}>Readiness and on-board tests</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {readiness ? (
          <>
            <View style={[styles.mil, readiness.milOn && styles.milOn]}>
              <Text style={[styles.milText, readiness.milOn && styles.milTextOn]}>
                {readiness.milOn ? 'Check engine light ON' : 'Check engine light off'}
              </Text>
              <Text style={styles.milCount}>
                {readiness.dtcCount} stored code{readiness.dtcCount === 1 ? '' : 's'} ·{' '}
                {readiness.compressionIgnition ? 'compression ignition' : 'spark ignition'}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Readiness</Text>
            {readiness.monitors.map((monitor) => (
              <View key={monitor.name} style={styles.row}>
                <Text style={styles.name}>{monitor.name}</Text>
                <Text style={[styles.state, { color: STATE_COLOR[monitor.state] }]}>
                  {STATE_LABEL[monitor.state]}
                </Text>
              </View>
            ))}
          </>
        ) : (
          <Text style={styles.status}>{loading ? 'Reading…' : 'Readiness not reported.'}</Text>
        )}

        <Text style={styles.sectionTitle}>On-board test results</Text>
        {!mode06Supported ? (
          <Text style={styles.status}>Mode 06 not supported by this vehicle.</Text>
        ) : tests.length === 0 ? (
          <Text style={styles.status}>{loading ? 'Reading…' : 'No test results reported.'}</Text>
        ) : (
          tests.map((test) => (
            <View key={`${test.monitorId}-${test.testId}`} style={styles.testRow}>
              <View style={styles.testText}>
                <Text style={styles.name}>{test.monitorName}</Text>
                <Text style={styles.testDetail}>
                  {test.value.toFixed(2)} {test.unit} · limits {test.min.toFixed(2)}–{test.max.toFixed(2)}
                  {test.scaled ? '' : ' (raw counts)'}
                </Text>
              </View>
              <Text style={[styles.state, { color: test.passed ? colors.live : colors.redline }]}>
                {test.passed ? 'Pass' : 'Fail'}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Refresh" onPress={load} variant="secondary" disabled={loading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.lg, paddingBottom: spacing.md, gap: 2 },
  title: { fontFamily: fonts.display, fontSize: 30, fontWeight: '700', color: colors.readout },
  subtitle: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, color: colors.dim },
  body: { gap: spacing.xs, paddingBottom: spacing.lg },
  mil: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.panel,
    gap: 2,
    marginBottom: spacing.md,
  },
  milOn: { borderColor: colors.redline },
  milText: { fontFamily: fonts.body, fontSize: 15, color: colors.readout },
  milTextOn: { color: colors.redline },
  milCount: { fontFamily: fonts.mono, fontSize: 11, color: colors.dim },
  sectionTitle: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.amber,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.panel,
    borderRadius: radius.sm,
  },
  testRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.panel,
    borderRadius: radius.sm,
  },
  testText: { flex: 1, gap: 2 },
  testDetail: { fontFamily: fonts.mono, fontSize: 10, color: colors.dim },
  name: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.readout },
  state: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  status: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.dim, paddingVertical: spacing.sm },
  footer: { paddingVertical: spacing.md },
});
