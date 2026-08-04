import Constants from 'expo-constants';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { FieldRow } from '@/components/rows';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { AppText } from '@/components/text';
import { AUTHORED_CODES, DTC_CATALOG } from '@/lib/obd/dtc';
import { PID_DEFINITIONS } from '@/lib/obd/pids';
import { useThemedStyles, type Theme } from '@/theme';

import { useSettings } from '../context/settings-provider';

export function AboutScreen() {
  const styles = useThemedStyles(createStyles);
  const { reset } = useSettings();
  const version = Constants.expoConfig?.version ?? '—';

  const confirmReset = () => {
    Alert.alert(
      'Reset all settings?',
      'Units, appearance, adapter preferences and your Live data selection go back to their ' +
        'defaults. Nothing on the car is touched.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: reset },
      ],
    );
  };

  return (
    <Screen edges={{ top: false }}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Section title="This app">
          <FieldRow label="Version">
            <AppText variant="bodyStrong">{version}</AppText>
          </FieldRow>
          <FieldRow label="Sensors known">
            <AppText variant="bodyStrong">{PID_DEFINITIONS.length} standard readings</AppText>
          </FieldRow>
          <FieldRow label="Trouble codes">
            <AppText variant="bodyStrong">
              {AUTHORED_CODES.length} written in full, {Object.keys(DTC_CATALOG).length} named
            </AppText>
          </FieldRow>
        </Section>

        <Section title="What it can see">
          <View style={styles.prose}>
            <AppText variant="body">
              This app speaks generic OBD-II, the standard every petrol car since 2001 and every
              diesel since 2004 must support. That covers the engine and its emission controls, and
              on many cars the automatic transmission too.
            </AppText>
            <AppText variant="body">
              It cannot reach ABS, airbags, power steering or comfort modules. Those use
              manufacturer-specific protocols that differ by brand, so a warning light for one of
              them will not show up here even though the car knows exactly what is wrong.
            </AppText>
            <AppText variant="body">
              Codes it does not have a written description for still get a real explanation, worked
              out from where the number sits in the standard. Each code says which of those it is.
            </AppText>
          </View>
        </Section>

        <Section title="A word on clearing codes">
          <View style={styles.prose}>
            <AppText variant="body">
              Clearing a code turns the light off without repairing anything. It also wipes the
              readiness monitors, and until those finish running again the car will fail an
              emissions test. If the fault is still there, the code comes back.
            </AppText>
          </View>
        </Section>

        <Section title="Start over">
          <Button label="Reset all settings" onPress={confirmReset} variant="secondary" />
        </Section>
      </ScrollView>
    </Screen>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    body: { gap: t.space.xl, paddingTop: t.space.lg, paddingBottom: t.space.xxxl },
    prose: { gap: t.space.md },
  });
