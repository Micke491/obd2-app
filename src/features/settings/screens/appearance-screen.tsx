import { ScrollView, StyleSheet } from 'react-native';

import { ChoiceRow } from '@/components/rows';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { AppText } from '@/components/text';
import { useThemedStyles, type Theme } from '@/theme';

import { useSettings } from '../context/settings-provider';
import type { ThemeMode } from '../types';

const MODES: { value: ThemeMode; label: string; hint: string }[] = [
  { value: 'auto', label: 'Match the phone', hint: 'Follows your system light and dark setting' },
  { value: 'light', label: 'Light', hint: 'Best in daylight and through a windscreen' },
  { value: 'dark', label: 'Dark', hint: 'Easier on the eyes at night' },
];

export function AppearanceScreen() {
  const styles = useThemedStyles(createStyles);
  const { settings, update } = useSettings();

  return (
    <Screen edges={{ top: false }}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Section title="Theme">
          {MODES.map((mode) => (
            <ChoiceRow
              key={mode.value}
              label={mode.label}
              hint={mode.hint}
              selected={settings.themeMode === mode.value}
              onPress={() => update({ themeMode: mode.value })}
            />
          ))}
        </Section>

        <AppText variant="caption" tone="faint">
          The change applies straight away — no restart needed.
        </AppText>
      </ScrollView>
    </Screen>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    body: { gap: t.space.xl, paddingTop: t.space.lg, paddingBottom: t.space.xxxl },
  });
