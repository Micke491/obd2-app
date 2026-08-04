import { StyleSheet, View } from 'react-native';

import { useTheme, useThemedStyles, type Theme } from '@/theme';

/**
 * Horizontal bar showing where a reading sits in its range.
 *
 * The fraction is always computed on raw canonical values, never converted
 * ones — see gaugeFraction in src/lib/units/format.ts for why that is safe.
 */
export function Meter({
  fraction,
  color,
  height = 4,
  /** Position of a redline or limit marker, 0–1. */
  marker,
}: {
  fraction: number;
  color?: string;
  height?: number;
  marker?: number;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const width = `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%` as const;

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View
        style={[
          styles.fill,
          { width, backgroundColor: color ?? theme.color.accent, borderRadius: height / 2 },
        ]}
      />
      {marker !== undefined ? (
        <View style={[styles.marker, { left: `${Math.round(marker * 100)}%` }]} />
      ) : null}
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    track: {
      width: '100%',
      backgroundColor: t.color.surfaceSunken,
      overflow: 'hidden',
    },
    fill: { height: '100%' },
    marker: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: 2,
      backgroundColor: t.color.danger,
    },
  });
