import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { AppText } from '@/components/text';
import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import { parseMonitorTests, type MonitorTest } from '@/lib/obd/mode06';
import { parseReadiness, type MonitorState, type ReadinessStatus } from '@/lib/obd/monitors';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

const STATE_LABEL: Record<MonitorState, string> = {
  complete: 'Ready',
  incomplete: 'Not run yet',
  unsupported: 'Not fitted',
};

export function MonitorsScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
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
        setTests(parseMonitorTests(results.hex));
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

  const stateColor = (state: MonitorState) =>
    state === 'complete' ? theme.color.ok : state === 'incomplete' ? theme.color.warn : theme.color.inkFaint;

  const notReady = readiness?.monitors.filter((monitor) => monitor.state === 'incomplete').length ?? 0;

  return (
    <Screen edges={{ top: false }}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <AppText variant="body" tone="muted">
          The car runs its own emissions self-tests as you drive. An emissions test will not even
          start until enough of them have finished, which is why clearing codes right before a test
          is a bad idea.
        </AppText>

        {readiness ? (
          <Card spine={readiness.milOn ? theme.color.danger : theme.color.ok}>
            <View style={styles.milHead}>
              <MaterialCommunityIcons
                name={readiness.milOn ? 'engine' : 'engine-outline'}
                size={20}
                color={readiness.milOn ? theme.color.danger : theme.color.ok}
              />
              <AppText variant="subheading" style={{ color: readiness.milOn ? theme.color.danger : theme.color.ok }}>
                {readiness.milOn ? 'Check engine light is on' : 'Check engine light is off'}
              </AppText>
            </View>
            <AppText variant="caption" tone="muted" style={styles.milMeta}>
              {readiness.dtcCount} stored code{readiness.dtcCount === 1 ? '' : 's'} ·{' '}
              {readiness.compressionIgnition ? 'Diesel' : 'Petrol'} ·{' '}
              {notReady === 0 ? 'all tests complete' : `${notReady} test${notReady === 1 ? '' : 's'} still to run`}
            </AppText>
          </Card>
        ) : (
          <AppText variant="caption" tone="muted">
            {loading ? 'Reading…' : 'This car did not report its readiness status.'}
          </AppText>
        )}

        {readiness ? (
          <Section
            title="Readiness"
            hint="Each of these has to finish before the car is ready for an emissions test."
          >
            {readiness.monitors.map((monitor) => (
              <View key={monitor.name} style={styles.row}>
                <AppText variant="body" style={styles.name} numberOfLines={1}>
                  {monitor.name}
                </AppText>
                <AppText variant="eyebrow" style={{ color: stateColor(monitor.state) }}>
                  {STATE_LABEL[monitor.state]}
                </AppText>
              </View>
            ))}
          </Section>
        ) : null}

        <Section
          title="On-board test results"
          hint="The actual measurements behind those tests, with the limits the car judges them against."
        >
          {!mode06Supported ? (
            <AppText variant="caption" tone="muted">
              This car does not report detailed test results.
            </AppText>
          ) : tests.length === 0 ? (
            <AppText variant="caption" tone="muted">
              {loading ? 'Reading…' : 'No test results reported yet.'}
            </AppText>
          ) : (
            tests.map((test) => (
              <View key={`${test.monitorId}-${test.testId}`} style={styles.row}>
                <View style={styles.testText}>
                  <AppText variant="body" numberOfLines={1}>
                    {test.monitorName}
                  </AppText>
                  <AppText variant="caption" tone="faint">
                    {test.value.toFixed(2)} {test.unit} · allowed {test.min.toFixed(2)}–
                    {test.max.toFixed(2)}
                    {test.scaled ? '' : ' (raw counts)'}
                  </AppText>
                </View>
                <AppText
                  variant="eyebrow"
                  style={{ color: test.passed ? theme.color.ok : theme.color.danger }}
                >
                  {test.passed ? 'Pass' : 'Fail'}
                </AppText>
              </View>
            ))
          )}
        </Section>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Read again" onPress={() => void load()} variant="secondary" busy={loading} icon="refresh" />
      </View>
    </Screen>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    body: { gap: t.space.xl, paddingTop: t.space.lg, paddingBottom: t.space.lg },
    milHead: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
    milMeta: { marginTop: t.space.sm },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: t.space.md,
      paddingVertical: t.space.md,
      borderBottomWidth: t.size.hairline,
      borderBottomColor: t.color.rule,
    },
    name: { flex: 1 },
    testText: { flex: 1, gap: 1 },
    footer: { paddingVertical: t.space.md },
  });
