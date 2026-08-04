import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { AppText } from '@/components/text';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

export type HubCardProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  /** One short line saying what you get, not what it is called. */
  hint: string;
  onPress: () => void;
  disabled?: boolean;
  /** Live count or state, e.g. "2 codes" or "Live". */
  badge?: { text: string; tone: 'accent' | 'ok' | 'danger' | 'muted' } | null;
};

const PRESS_SCALE = 0.97;

export function HubCard({ icon, title, hint, onPress, disabled = false, badge }: HubCardProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const scale = useRef(new Animated.Value(1)).current;

  const spring = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 4 }).start();

  const badgeColor = badge
    ? badge.tone === 'ok'
      ? theme.color.ok
      : badge.tone === 'danger'
        ? theme.color.danger
        : badge.tone === 'accent'
          ? theme.color.accentInk
          : theme.color.inkFaint
    : theme.color.inkFaint;

  return (
    <Animated.View style={[styles.wrap, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => !disabled && spring(PRESS_SCALE)}
        onPressOut={() => spring(1)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${hint}`}
        accessibilityState={{ disabled }}
        style={[styles.card, disabled && styles.disabled]}
      >
        <View style={styles.top}>
          <View style={styles.iconWell}>
            <MaterialCommunityIcons
              name={icon}
              size={22}
              color={disabled ? theme.color.inkFaint : theme.color.accent}
            />
          </View>
          {badge ? (
            <View style={[styles.badge, { borderColor: badgeColor }]}>
              <AppText variant="eyebrow" style={{ color: badgeColor }}>
                {badge.text}
              </AppText>
            </View>
          ) : null}
        </View>

        <View style={styles.text}>
          <AppText variant="subheading" numberOfLines={1}>
            {title}
          </AppText>
          <AppText variant="caption" tone="muted" numberOfLines={2}>
            {disabled ? 'Connect to use this' : hint}
          </AppText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    wrap: { flex: 1 },
    card: {
      minHeight: 132,
      padding: t.space.lg,
      justifyContent: 'space-between',
      gap: t.space.lg,
      backgroundColor: t.color.surface,
      borderRadius: t.radius.lg,
      borderWidth: t.size.hairline,
      borderColor: t.color.rule,
      ...t.shadow.card,
    },
    disabled: { opacity: 0.5 },
    top: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    iconWell: {
      width: 38,
      height: 38,
      borderRadius: t.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.color.accentWash,
    },
    badge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: t.radius.sm,
      borderWidth: 1,
    },
    text: { gap: 2 },
  });
