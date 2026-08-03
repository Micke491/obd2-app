import { Pressable, StyleSheet, Text } from 'react-native';

import { TOUCH_TARGET, colors, fonts, radius, spacing } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
};

const TINT: Record<ButtonVariant, string> = {
  primary: colors.amber,
  secondary: colors.dim,
  danger: colors.redline,
};

export function Button({ label, onPress, variant = 'primary', disabled = false }: ButtonProps) {
  const tint = TINT[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.base,
        { borderColor: tint },
        pressed && { backgroundColor: colors.panelActive },
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.label, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.35,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
