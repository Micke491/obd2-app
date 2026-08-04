import { StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { useTheme, useThemedStyles, type Theme } from '@/theme';

import { AppText } from './text';
import { Button } from './button';

type EmptyStateProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  /** Say what to do next. An empty screen is an invitation, not a dead end. */
  body: string;
  tone?: 'neutral' | 'good';
  action?: { label: string; onPress: () => void };
};

export function EmptyState({ icon, title, body, tone = 'neutral', action }: EmptyStateProps) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const color = tone === 'good' ? theme.color.ok : theme.color.inkFaint;

  return (
    <View style={styles.root}>
      <View style={[styles.badge, { borderColor: color }]}>
        <MaterialCommunityIcons name={icon} size={26} color={color} />
      </View>
      <AppText variant="subheading" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="body" tone="muted" style={styles.body}>
        {body}
      </AppText>
      {action ? (
        <View style={styles.action}>
          <Button label={action.label} onPress={action.onPress} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    root: {
      alignItems: 'center',
      paddingVertical: t.space.xxxl,
      paddingHorizontal: t.space.lg,
      gap: t.space.sm,
    },
    badge: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: t.space.sm,
    },
    title: { textAlign: 'center' },
    body: { textAlign: 'center', maxWidth: 320 },
    action: { marginTop: t.space.md, minWidth: 180 },
  });
