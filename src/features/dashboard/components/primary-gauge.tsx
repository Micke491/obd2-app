import { StyleSheet, View } from 'react-native';

import { Meter } from '@/components/meter';
import { AppText } from '@/components/text';
import { NO_VALUE } from '@/lib/units';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

const SCALE_MAX = 8000;
const AMBER_FROM = 3500;
const REDLINE_FROM = 6500;

/** The one reading big enough to read at a glance from the driver's seat. */
export function PrimaryGauge({ rpm }: { rpm: number | null }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const tint =
    rpm === null
      ? theme.color.inkFaint
      : rpm >= REDLINE_FROM
        ? theme.color.danger
        : rpm >= AMBER_FROM
          ? theme.color.accent
          : theme.color.ink;

  return (
    <View style={styles.root}>
      <AppText variant="eyebrow" tone="muted">
        Engine speed
      </AppText>
      <View style={styles.readoutRow}>
        <AppText style={[styles.readout, { color: tint }]} numberOfLines={1} adjustsFontSizeToFit>
          {rpm === null ? NO_VALUE : Math.round(rpm).toLocaleString('en-GB')}
        </AppText>
        <AppText variant="eyebrow" tone="faint" style={styles.unit}>
          rpm
        </AppText>
      </View>
      <Meter
        fraction={(rpm ?? 0) / SCALE_MAX}
        color={tint}
        height={6}
        marker={REDLINE_FROM / SCALE_MAX}
      />
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    root: { width: '100%', gap: t.space.sm, alignItems: 'center' },
    readoutRow: { flexDirection: 'row', alignItems: 'baseline', gap: t.space.sm },
    readout: {
      fontFamily: t.font.displayBold,
      fontSize: 76,
      lineHeight: 84,
      letterSpacing: -2,
      fontVariant: ['tabular-nums'],
    },
    unit: { paddingBottom: 8 },
  });
