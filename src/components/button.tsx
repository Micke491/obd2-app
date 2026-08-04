import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useTheme, useThemedStyles, type Theme } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  busy?: boolean;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
};

/** Sentence case, not tracked uppercase — a button should read as an action. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  busy = false,
  icon,
}: ButtonProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const inactive = disabled || busy;

  const tint =
    variant === 'primary'
      ? theme.color.onFill
      : variant === 'danger'
        ? theme.color.danger
        : variant === 'ghost'
          ? theme.color.inkMuted
          : theme.color.ink;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !inactive && styles.pressed,
        inactive && styles.disabled,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={tint} />
      ) : (
        <View style={styles.content}>
          {icon ? <MaterialCommunityIcons name={icon} size={17} color={tint} /> : null}
          <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    base: {
      minHeight: t.size.touch,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: t.space.lg,
      borderRadius: t.radius.md,
      borderWidth: 1,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space.sm,
    },
    primary: {
      backgroundColor: t.color.accent,
      borderColor: t.color.accent,
    },
    secondary: {
      backgroundColor: t.color.surface,
      borderColor: t.color.ruleStrong,
    },
    danger: {
      backgroundColor: t.color.dangerWash,
      borderColor: t.color.danger,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
    },
    pressed: {
      opacity: 0.82,
    },
    disabled: {
      opacity: 0.4,
    },
    label: {
      fontFamily: t.font.bodySemibold,
      fontSize: 15,
      letterSpacing: 0.1,
    },
  });
