import { StyleSheet, View } from 'react-native';

import { useThemedStyles, type Theme } from '@/theme';

import { AppText } from './text';

/**
 * The masthead every screen opens with: a tracked eyebrow naming the report,
 * the title, and a status line that says what you are actually looking at.
 */
export function ScreenHeader({
  eyebrow,
  title,
  status,
}: {
  eyebrow: string;
  title: string;
  status?: string;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.root}>
      <AppText variant="eyebrow" tone="accent">
        {eyebrow}
      </AppText>
      <AppText variant="title">{title}</AppText>
      {status ? (
        <AppText variant="caption" tone="muted">
          {status}
        </AppText>
      ) : null}
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    root: {
      paddingTop: t.space.lg,
      paddingBottom: t.space.lg,
      gap: t.space.xs,
    },
  });
