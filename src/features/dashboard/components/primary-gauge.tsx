import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing } from '@/theme';

const SCALE_MAX = 8000;
const REDLINE = 6500;
const AMBER_FROM = 3500;

export function rpmColor(rpm: number | null): string {
  if (rpm === null) return colors.dim;
  if (rpm >= REDLINE) return colors.redline;
  if (rpm >= AMBER_FROM) return colors.amber;
  return colors.readout;
}

export function PrimaryGauge({ rpm }: { rpm: number | null }) {
  const tint = rpmColor(rpm);
  const fraction = rpm === null ? 0 : Math.min(rpm / SCALE_MAX, 1);

  return (
    <View style={styles.root}>
      <Text
        style={[styles.value, { color: tint }]}
        allowFontScaling={false}
        accessibilityLabel={rpm === null ? 'Waiting for engine speed' : `${rpm} revolutions per minute`}
      >
        {rpm === null ? '––––' : String(Math.round(rpm))}
      </Text>
      <Text style={styles.unit}>RPM</Text>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${fraction * 100}%`, backgroundColor: tint }]} />
        <View style={[styles.redline, { left: `${(REDLINE / SCALE_MAX) * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    width: '100%',
  },
  value: {
    fontFamily: fonts.display,
    fontSize: 104,
    fontWeight: '700',
    lineHeight: 112,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 6,
    color: colors.dim,
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
  },
  track: {
    width: '100%',
    height: 5,
    backgroundColor: colors.panel,
    borderRadius: 3,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  redline: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.redline,
    opacity: 0.7,
  },
});
