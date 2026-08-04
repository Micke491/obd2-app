import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useThemedStyles, type Theme } from '@/theme';

type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Coloured left rule that encodes state — severity, pass/fail, live. */
  spine?: string;
  accessibilityLabel?: string;
};

export function Card({ children, onPress, style, spine, accessibilityLabel }: CardProps) {
  const styles = useThemedStyles(createStyles);
  const body = (
    <>
      {spine ? <View style={[styles.spine, { backgroundColor: spine }]} /> : null}
      <View style={styles.inner}>{children}</View>
    </>
  );

  if (!onPress) {
    return <View style={[styles.card, spine ? styles.withSpine : null, style]}>{body}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.card,
        spine ? styles.withSpine : null,
        pressed && styles.pressed,
        style,
      ]}
    >
      {body}
    </Pressable>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: t.color.surface,
      borderRadius: t.radius.lg,
      borderWidth: t.size.hairline,
      borderColor: t.color.rule,
      overflow: 'hidden',
      ...t.shadow.card,
    },
    withSpine: {
      flexDirection: 'row',
    },
    spine: {
      width: 4,
    },
    inner: {
      flex: 1,
      padding: t.space.lg,
    },
    pressed: {
      backgroundColor: t.color.surfaceSunken,
    },
  });
