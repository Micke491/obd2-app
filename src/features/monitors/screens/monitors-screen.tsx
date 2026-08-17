import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { AppText } from '@/components/text';
import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import { TestGroup, TestRow } from '@/features/monitors/components/test-group';
import { runMode06, type Mode06Result } from '@/features/monitors/lib/run-mode06';
import { FAMILY_ORDER } from '@/lib/obd/mode06';
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
  const [result, setResult] = useState<Mode06Result | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);

    try {
      const status = await client.query('0101', 4000);
      setReadiness(status.ok ? parseReadiness(status.hex) : null);
    } catch {
      setReadiness(null);
    }

    setProgress({ done: 0, total: 0 });
    try {
      setResult(await runMode06(client, (done, total) => setProgress({ done, total })));
    } catch {
      setResult(null);
    }

    setLoading(false);
  }, [client]);

  useEffect(() => {
    void load();
  }, [load]);

  const stateColor = (state: MonitorState) =>
    state === 'complete' ? theme.color.ok : state === 'incomplete' ? theme.color.warn : theme.color.inkFaint;

  const notReady = readiness?.monitors.filter((monitor) => monitor.state === 'incomplete').length ?? 0;

  const tests = result?.tests ?? [];
  const failing = tests.filter((test) => !test.passed);
  const grouped = useMemo(
    () =>
      tests.reduce<Record<string, typeof tests>>((acc, test) => {
        (acc[test.family] ??= []).push(test);
        return acc;
      }, {}),
    [tests],
  );

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
          meta={tests.length > 0 ? `${tests.length} results` : undefined}
        >
          {loading && result === null ? (
            <AppText variant="caption" tone="muted">
              Reading…
            </AppText>
          ) : result === null || result.advertised === 0 ? (
            <AppText variant="caption" tone="muted">
              This car does not report detailed test results.
            </AppText>
          ) : (
            <>
              {/* A failure lifted out of its group, so it cannot hide inside a
                  collapsed heading nobody thought to open. */}
              {failing.map((test) => (
                <TestRow key={`failing-${test.monitorId}-${test.testId}`} test={test} />
              ))}

              {FAMILY_ORDER.filter((family) => grouped[family]?.length).map((family) => (
                <TestGroup key={family} family={family} tests={grouped[family]} />
              ))}

              {result.silent > 0 ? (
                <AppText variant="caption" tone="muted" style={styles.note}>
                  {result.silent} test{result.silent === 1 ? '' : 's'} the car listed but did not
                  answer.
                </AppText>
              ) : null}

              {result.aborted ? (
                <AppText variant="caption" tone="warn" style={styles.note}>
                  The adapter stopped responding partway through, so this list is incomplete.
                </AppText>
              ) : null}
            </>
          )}
        </Section>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={
            loading && progress.total > 0
              ? `Reading ${progress.done} of ${progress.total}`
              : 'Read again'
          }
          onPress={() => void load()}
          variant="secondary"
          busy={loading}
          icon="refresh"
        />
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
    note: { marginTop: t.space.sm },
    footer: { paddingVertical: t.space.md },
  });
