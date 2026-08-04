import { StyleSheet, Text, View } from 'react-native';

import { formatPidValue, type PidDefinition } from '@/lib/obd/pids';
import { colors, fonts, radius, spacing } from '@/theme';

type GaugeTileProps = {
  definition: PidDefinition;
  value: number | null;
  text: string | null;
};

export function GaugeTile({ definition, value, text }: GaugeTileProps) {
  const display = text ?? (value === null ? '––' : formatPidValue(definition, value));
  const span = definition.max - definition.min;
  const fraction = value === null || span <= 0 ? 0 : Math.min(Math.max((value - definition.min) / span, 0), 1);

  return (
    <View style={styles.tile}>
      <Text style={styles.label} numberOfLines={1}>
        {definition.short}
      </Text>

      <View style={styles.readingRow}>
        <Text style={styles.value} allowFontScaling={false} numberOfLines={1}>
          {display}
        </Text>
        {definition.unit && !text ? <Text style={styles.unit}>{definition.unit}</Text> : null}
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${fraction * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.dim,
  },
  readingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    flexShrink: 1,
    fontFamily: fonts.display,
    fontSize: 28,
    fontWeight: '600',
    color: colors.readout,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.dim,
  },
  track: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.amber,
    borderRadius: 2,
  },
});
