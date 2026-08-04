import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles, type Theme } from '@/theme';

type SegmentedProps<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
};

export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      backgroundColor: t.color.surfaceSunken,
      borderRadius: t.radius.md,
      padding: 3,
      gap: 3,
    },
    segment: {
      flex: 1,
      minHeight: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: t.radius.sm,
      paddingHorizontal: t.space.sm,
    },
    segmentSelected: {
      backgroundColor: t.color.surfaceRaised,
      ...t.shadow.card,
    },
    label: {
      fontFamily: t.font.bodyMedium,
      fontSize: 14,
      color: t.color.inkMuted,
    },
    labelSelected: {
      fontFamily: t.font.bodySemibold,
      color: t.color.ink,
    },
  });
