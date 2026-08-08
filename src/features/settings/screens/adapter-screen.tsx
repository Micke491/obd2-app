import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceRow, FieldRow, SwitchRow } from '@/components/rows';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { AppText } from '@/components/text';
import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import { useThemedStyles, type Theme } from '@/theme';

import { useSettings } from '../context/settings-provider';
import { POLL_RATES, POLL_RATE_LABELS, TIMEOUTS, type PollRate, type QueryTimeout } from '../types';

const TIMEOUT_HINTS: Record<QueryTimeout, string> = {
  1500: 'Only for a fast, genuine adapter',
  2500: 'Suits most adapters',
  4000: 'Give a slow clone more room',
  6000: 'Last resort for an unreliable link',
};

export function AdapterScreen() {
  const styles = useThemedStyles(createStyles);
  const { settings, update } = useSettings();
  const { protocol, log } = useObdConnection();

  const forget = () => {
    Alert.alert(
      'Forget this adapter?',
      'Next time you connect, the app will search your paired devices again instead of going ' +
        'straight to this one.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Forget',
          style: 'destructive',
          onPress: () => update({ lastAdapterAddress: null, lastAdapterName: null }),
        },
      ],
    );
  };

  return (
    <Screen edges={{ top: false }}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Section
          title="Polling speed"
          hint="How long to pause between passes over your sensors. Cheap adapters cope better with a longer pause."
        >
          {POLL_RATES.map((rate) => (
            <ChoiceRow
              key={rate}
              label={POLL_RATE_LABELS[rate]}
              hint={rate === 0 ? 'No pause at all' : `${rate} ms between passes`}
              selected={settings.pollIntervalMs === rate}
              onPress={() => update({ pollIntervalMs: rate as PollRate })}
            />
          ))}
        </Section>

        <Section
          title="Reply timeout"
          hint="How long to wait for one answer before giving up and moving on."
        >
          {TIMEOUTS.map((timeout) => (
            <ChoiceRow
              key={timeout}
              label={`${(timeout / 1000).toFixed(1)} seconds`}
              hint={TIMEOUT_HINTS[timeout]}
              selected={settings.queryTimeoutMs === timeout}
              onPress={() => update({ queryTimeoutMs: timeout as QueryTimeout })}
            />
          ))}
        </Section>

        <Section title="Remembered adapter">
          {settings.lastAdapterAddress ? (
            <>
              <FieldRow label="Name">
                <AppText variant="bodyStrong">{settings.lastAdapterName ?? 'Unnamed device'}</AppText>
              </FieldRow>
              <FieldRow label="Address">
                <AppText variant="mono">{settings.lastAdapterAddress}</AppText>
              </FieldRow>
              <Button label="Forget this adapter" onPress={forget} variant="secondary" />
            </>
          ) : (
            <AppText variant="body" tone="muted">
              No adapter remembered yet. The first one that connects successfully is saved here, so
              a phone paired with several devices still connects first try.
            </AppText>
          )}
        </Section>

        <Section
          title="Last connection"
          hint="What the app and the adapter said to each other, most recent attempt. Worth reading when a car will not answer."
        >
          {protocol ? (
            <FieldRow label="Protocol">
              <AppText variant="bodyStrong">{protocol}</AppText>
            </FieldRow>
          ) : null}

          {log.length > 0 ? (
            <View style={styles.log}>
              {log.map((line, index) => (
                <AppText key={`${index}-${line}`} variant="mono" tone="muted" style={styles.logLine}>
                  {line}
                </AppText>
              ))}
            </View>
          ) : (
            <AppText variant="body" tone="muted">
              Nothing recorded yet. Connect once and the steps taken to reach your car show up
              here, including every protocol tried and what came back.
            </AppText>
          )}
        </Section>

        <Section title="On launch">
          <SwitchRow
            label="Connect automatically"
            hint="Try the remembered adapter as soon as the app opens"
            value={settings.autoConnectOnLaunch}
            onValueChange={(autoConnectOnLaunch) => update({ autoConnectOnLaunch })}
          />
        </Section>
      </ScrollView>
    </Screen>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    body: { gap: t.space.xl, paddingTop: t.space.lg, paddingBottom: t.space.xxxl },
    log: { gap: t.space.xs },
    logLine: { fontSize: 11, lineHeight: 16 },
  });
