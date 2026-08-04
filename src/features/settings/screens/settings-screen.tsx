import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { Section } from '@/components/section';
import { NavRow, SwitchRow } from '@/components/rows';
import { AppText } from '@/components/text';
import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import { UNIT_OPTION_LABELS } from '@/lib/units';
import { useThemedStyles, type Theme } from '@/theme';

import { useSettings } from '../context/settings-provider';

const THEME_LABELS = { auto: 'Match the phone', light: 'Light', dark: 'Dark' } as const;

export function SettingsScreen() {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const { settings, update } = useSettings();
  const { status } = useObdConnection();

  const unitSummary =
    settings.units.system === 'custom'
      ? 'Custom'
      : settings.units.system === 'us'
        ? 'US'
        : settings.units.system === 'imperial'
          ? 'Imperial'
          : 'Metric';

  return (
    <Screen>
      <ScreenHeader eyebrow="Preferences" title="Settings" />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Section title="How things are shown">
          <NavRow
            icon="ruler"
            label="Units"
            hint={`${UNIT_OPTION_LABELS[settings.units.temperature]} · ${UNIT_OPTION_LABELS[settings.units.speed]}`}
            value={unitSummary}
            onPress={() => router.push('/settings/units')}
          />
          <NavRow
            icon="theme-light-dark"
            label="Appearance"
            hint="Light, dark, or follow the phone"
            value={THEME_LABELS[settings.themeMode]}
            onPress={() => router.push('/settings/appearance')}
          />
        </Section>

        <Section title="Adapter">
          <NavRow
            icon="bluetooth-settings"
            label="Connection"
            hint="Polling speed, timeouts and the remembered adapter"
            value={status === 'connected' ? 'Connected' : 'Idle'}
            onPress={() => router.push('/settings/adapter')}
          />
          <SwitchRow
            icon="lightbulb-on-outline"
            label="Keep the screen on"
            hint="Stops the phone sleeping while you are reading live data"
            value={settings.keepAwake}
            onValueChange={(keepAwake) => update({ keepAwake })}
          />
        </Section>

        <Section title="Sensors">
          <SwitchRow
            icon="eye-outline"
            label="Show unsupported sensors"
            hint="List every standard sensor, including ones this car does not answer for"
            value={settings.showUnsupportedSensors}
            onValueChange={(showUnsupportedSensors) => update({ showUnsupportedSensors })}
          />
        </Section>

        <Section title="Reference">
          <NavRow
            icon="magnify"
            label="Look up a code"
            hint="Search any trouble code, with or without the car connected"
            onPress={() => router.push('/settings/lookup')}
          />
          <NavRow
            icon="car-info"
            label="Vehicle details"
            hint="VIN, protocol and what the car reports about itself"
            onPress={() => router.push('/vehicle')}
          />
          <NavRow
            icon="information-outline"
            label="About"
            hint="Version, limits and what this app can and cannot see"
            onPress={() => router.push('/settings/about')}
          />
        </Section>

        <View style={styles.note}>
          <AppText variant="caption" tone="faint">
            Changes save as you make them.
          </AppText>
        </View>
      </ScrollView>
    </Screen>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    body: { gap: t.space.xl, paddingBottom: t.space.xxxl },
    note: { paddingTop: t.space.sm },
  });
