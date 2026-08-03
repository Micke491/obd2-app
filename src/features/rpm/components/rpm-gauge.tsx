import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing } from '@/theme';

/** Sweep ceiling. Covers the usable range of a stock petrol or diesel engine. */
const SCALE_MAX = 8000;
/** Where the sweep turns red. */
const REDLINE = 6500;
/** Where the readout warms from white toward amber. */
const AMBER_FROM = 3500;

export function rpmColor(rpm: number | null): string {
  if (rpm === null) return colors.dim;
  if (rpm >= REDLINE) return colors.redline;
  if (rpm >= AMBER_FROM) return colors.amber;
  return colors.readout;
}

type RpmGaugeProps = {
  rpm: number | null;
};

/**
 * The readout carries its own state through colour: white at idle, amber as the
 * revs climb, red past the redline. Glanced at from the driver's seat, the
 * colour registers before the digits do.
 */
export function RpmGauge({ rpm }: RpmGaugeProps) {
  const tint = rpmColor(rpm);
  const fraction = rpm === null ? 0 : Math.min(rpm / SCALE_MAX, 1);
  const redlineOffset = `${(REDLINE / SCALE_MAX) * 100}%`;

  return (
    <View style={styles.root}>
      <Text
        style={[styles.value, { color: tint }]}
        // Tabular figures stop the digits changing width as the number moves,
        // which otherwise makes the whole readout jitter several times a second.
        allowFontScaling={false}
        accessibilityLabel={rpm === null ? 'Waiting for engine speed' : `${rpm} revolutions per minute`}
      >
        {rpm === null ? '––––' : String(rpm)}
      </Text>

      <Text style={styles.unit}>RPM</Text>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${fraction * 100}%`, backgroundColor: tint }]} />
        <View style={[styles.redlineMark, { left: redlineOffset }]} />
      </View>

      <View style={styles.scale}>
        <Text style={styles.scaleLabel}>0</Text>
        <Text style={styles.scaleLabel}>{SCALE_MAX / 1000}k</Text>
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
    fontSize: 132,
    fontWeight: '700',
    lineHeight: 140,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontFamily: fonts.mono,
    fontSize: 13,
    letterSpacing: 6,
    color: colors.dim,
    marginTop: -spacing.sm,
    marginBottom: spacing.xl,
  },
  track: {
    width: '100%',
    height: 6,
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
  redlineMark: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.redline,
    opacity: 0.7,
  },
  scale: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  scaleLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.dim,
  },
});
