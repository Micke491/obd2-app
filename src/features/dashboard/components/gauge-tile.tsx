import { StyleSheet, View } from 'react-native';

import { Meter } from '@/components/meter';
import { AppText } from '@/components/text';
import { useUnits } from '@/hooks/use-units';
import type { PidDefinition } from '@/lib/obd/pids';
import { NO_VALUE, gaugeFraction } from '@/lib/units';
import { useThemedStyles, type Theme } from '@/theme';

export function GaugeTile({
  definition,
  value,
  text,
}: {
  definition: PidDefinition;
  value: number | null;
  text: string | null;
}) {
  const styles = useThemedStyles(createStyles);
  const { format } = useUnits();

  const measurement = value === null ? null : format(definition, value);
  const display = text ?? measurement?.text ?? NO_VALUE;
  // Raw value against the raw range: conversion cannot change the fraction.
  const fraction = gaugeFraction(definition, value);

  return (
    <View style={styles.tile}>
      <AppText variant="eyebrow" tone="muted" numberOfLines={1}>
        {definition.short}
      </AppText>

      <View style={styles.valueRow}>
        <AppText style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {display}
        </AppText>
        {!text && measurement?.unit ? (
          <AppText variant="caption" tone="faint" style={styles.unit}>
            {measurement.unit}
          </AppText>
        ) : null}
      </View>

      <Meter fraction={fraction} />
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    tile: {
      flex: 1,
      gap: t.space.sm,
      padding: t.space.lg,
      backgroundColor: t.color.surface,
      borderRadius: t.radius.lg,
      borderWidth: t.size.hairline,
      borderColor: t.color.rule,
      ...t.shadow.card,
    },
    valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: t.space.xs },
    value: {
      fontFamily: t.font.displayBold,
      fontSize: 28,
      lineHeight: 32,
      color: t.color.ink,
      fontVariant: ['tabular-nums'],
    },
    unit: { paddingBottom: 2 },
  });
