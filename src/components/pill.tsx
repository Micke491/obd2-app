import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles, type Theme } from '@/theme';

type PillProps = {
  label: string;
  color: string;
  background: string;
  /** Solid fill reads louder; reserve it for the most urgent state on screen. */
  filled?: boolean;
};

export function Pill({ label, color, background, filled = false }: PillProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View
      style={[
        styles.root,
        filled ? { backgroundColor: color } : { backgroundColor: background, borderColor: color },
        filled ? styles.filled : styles.outlined,
      ]}
    >
      <Text style={[styles.label, { color: filled ? '#FFFFFF' : color }]}>{label}</Text>
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    root: {
      alignSelf: 'flex-start',
      paddingHorizontal: t.space.sm,
      paddingVertical: 3,
      borderRadius: t.radius.sm,
    },
    outlined: { borderWidth: 1 },
    filled: { borderWidth: 0 },
    label: {
      fontFamily: t.font.monoMedium,
      fontSize: 10,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
  });
