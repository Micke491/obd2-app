import { ScrollView, StyleSheet, View } from 'react-native';

import { ChoiceRow } from '@/components/rows';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { Segmented } from '@/components/segmented';
import { AppText } from '@/components/text';
import {
  UNIT_CATEGORY_LABELS,
  UNIT_CATEGORY_OPTIONS,
  UNIT_OPTION_LABELS,
  formatMeasurement,
  type UnitChoices,
} from '@/lib/units';
import { useThemedStyles, type Theme } from '@/theme';

import { useSettings } from '../context/settings-provider';

/** A live example under each picker beats explaining the conversion in words. */
const EXAMPLES: Record<keyof UnitChoices, { unit: string; value: number; label: string }> = {
  temperature: { unit: '°C', value: 90, label: 'Coolant at operating temperature' },
  speed: { unit: 'km/h', value: 100, label: 'Motorway cruise' },
  distance: { unit: 'km', value: 250, label: 'A long trip' },
  pressure: { unit: 'kPa', value: 101, label: 'Air pressure at sea level' },
  volume: { unit: 'L/h', value: 8, label: 'Fuel use at a steady cruise' },
  torque: { unit: 'N·m', value: 200, label: 'A family car at full pull' },
};

const CATEGORIES = Object.keys(UNIT_CATEGORY_LABELS) as (keyof UnitChoices)[];

export function UnitsScreen() {
  const styles = useThemedStyles(createStyles);
  const { settings, updateUnits, applyUnitPreset } = useSettings();
  const prefs = settings.units;

  return (
    <Screen edges={{ top: false }}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Segmented
            options={[
              { value: 'metric', label: 'Metric' },
              { value: 'imperial', label: 'Imperial' },
              { value: 'us', label: 'US' },
            ]}
            value={prefs.system === 'custom' ? 'metric' : prefs.system}
            onChange={(system) => applyUnitPreset(system)}
          />
          <AppText variant="caption" tone="muted">
            {prefs.system === 'custom'
              ? 'You have mixed units, which is fine — picking a set above replaces all of them.'
              : 'Picking a set changes everything below. Change any one of them and this becomes a custom mix.'}
          </AppText>
        </View>

        {CATEGORIES.map((category) => {
          const example = EXAMPLES[category];
          const shown = formatMeasurement({ unit: example.unit }, example.value, prefs);

          return (
            <Section
              key={category}
              title={UNIT_CATEGORY_LABELS[category]}
              hint={`${example.label}: ${shown.full}`}
            >
              {UNIT_CATEGORY_OPTIONS[category].map((option) => (
                <ChoiceRow
                  key={option}
                  label={UNIT_OPTION_LABELS[option] ?? option}
                  selected={prefs[category] === option}
                  onPress={() => updateUnits({ [category]: option } as Partial<UnitChoices>)}
                />
              ))}
            </Section>
          );
        })}

        <AppText variant="caption" tone="faint" style={styles.footnote}>
          Air flow follows your fuel volume choice: grams per second with litres, pounds per minute
          with gallons.
        </AppText>
      </ScrollView>
    </Screen>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    body: { gap: t.space.xl, paddingTop: t.space.lg, paddingBottom: t.space.xxxl },
    intro: { gap: t.space.md },
    footnote: { paddingTop: t.space.sm },
  });
