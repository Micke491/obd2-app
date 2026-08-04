import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/text';
import type { LinkState } from '@/features/connection/types';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

const STATE_LABEL: Record<LinkState, string> = {
  idle: 'Waiting',
  pending: 'Linking',
  ready: 'Ready',
  failed: 'Failed',
};

/** Compact half-of-the-link indicator: adapter on the left, car on the right. */
export function LinkDot({ label, state }: { label: string; state: LinkState }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const tint =
    state === 'ready'
      ? theme.color.ok
      : state === 'pending'
        ? theme.color.accent
        : state === 'failed'
          ? theme.color.danger
          : theme.color.inkFaint;

  return (
    <View style={styles.row} accessibilityLabel={`${label}: ${STATE_LABEL[state]}`}>
      {state === 'pending' ? (
        <ActivityIndicator size="small" color={tint} style={styles.spinner} />
      ) : (
        <View style={[styles.dot, { backgroundColor: tint }]} />
      )}
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <AppText variant="caption" style={{ color: tint }}>
        {STATE_LABEL[state]}
      </AppText>
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
    dot: { width: 8, height: 8, borderRadius: 4 },
    spinner: { width: 8, height: 8 },
  });
