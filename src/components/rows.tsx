import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useTheme, useThemedStyles, type Theme } from '@/theme';

import { AppText } from './text';

type BaseRow = {
  label: string;
  hint?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
};

/** Tappable row that pushes somewhere. */
export function NavRow({
  label,
  hint,
  icon,
  value,
  onPress,
}: BaseRow & { value?: string; onPress: () => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {icon ? <MaterialCommunityIcons name={icon} size={20} color={theme.color.inkMuted} /> : null}
      <View style={styles.text}>
        <AppText variant="bodyStrong">{label}</AppText>
        {hint ? (
          <AppText variant="caption" tone="muted">
            {hint}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="caption" tone="muted" numberOfLines={1} style={styles.value}>
          {value}
        </AppText>
      ) : null}
      <MaterialCommunityIcons name="chevron-right" size={20} color={theme.color.inkFaint} />
    </Pressable>
  );
}

export function SwitchRow({
  label,
  hint,
  icon,
  value,
  onValueChange,
}: BaseRow & { value: boolean; onValueChange: (next: boolean) => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.row}>
      {icon ? <MaterialCommunityIcons name={icon} size={20} color={theme.color.inkMuted} /> : null}
      <View style={styles.text}>
        <AppText variant="bodyStrong">{label}</AppText>
        {hint ? (
          <AppText variant="caption" tone="muted">
            {hint}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.color.surfaceSunken, true: theme.color.accent }}
        thumbColor={theme.color.surfaceRaised}
        ios_backgroundColor={theme.color.surfaceSunken}
      />
    </View>
  );
}

/** Row in a single-choice list; the check is the selection, not a colour. */
export function ChoiceRow({
  label,
  hint,
  selected,
  onPress,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <AppText variant="bodyStrong">{label}</AppText>
        {hint ? (
          <AppText variant="caption" tone="muted">
            {hint}
          </AppText>
        ) : null}
      </View>
      {selected ? (
        <MaterialCommunityIcons name="check" size={20} color={theme.color.accentInk} />
      ) : null}
    </Pressable>
  );
}

/** Row in a multi-choice list; each row carries its own checkbox rather than
 *  sharing one selection with the rest of the list. */
export function CheckRow({
  label,
  hint,
  checked,
  onPress,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.text}>
        <AppText variant="bodyStrong">{label}</AppText>
        {hint ? (
          <AppText variant="caption" tone="muted">
            {hint}
          </AppText>
        ) : null}
      </View>
      <MaterialCommunityIcons
        name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
        size={22}
        color={checked ? theme.color.accentInk : theme.color.inkFaint}
      />
    </Pressable>
  );
}

/** Static label / value pair, for identification data. */
export function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.field}>
      <AppText variant="eyebrow" tone="faint">
        {label}
      </AppText>
      {children}
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    row: {
      minHeight: t.size.touch,
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space.md,
      paddingHorizontal: t.space.lg,
      paddingVertical: t.space.md,
      backgroundColor: t.color.surface,
      borderRadius: t.radius.md,
      borderWidth: t.size.hairline,
      borderColor: t.color.rule,
    },
    pressed: { backgroundColor: t.color.surfaceSunken },
    text: { flex: 1, gap: 1 },
    value: { maxWidth: '45%', textAlign: 'right' },
    field: {
      gap: t.space.xs,
      paddingHorizontal: t.space.lg,
      paddingVertical: t.space.md,
      backgroundColor: t.color.surface,
      borderRadius: t.radius.md,
      borderWidth: t.size.hairline,
      borderColor: t.color.rule,
    },
  });
