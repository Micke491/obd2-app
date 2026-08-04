import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useThemedStyles, type Theme } from '@/theme';

import { AppText } from './text';

type SectionProps = {
  title: string;
  /** One plain sentence saying what this group of readings is for. */
  hint?: string;
  /** Right-aligned count or status, e.g. "3 codes". */
  meta?: string;
  children: ReactNode;
};

export function Section({ title, hint, meta, children }: SectionProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <AppText variant="eyebrow" tone="accent">
          {title}
        </AppText>
        {meta ? (
          <AppText variant="eyebrow" tone="faint">
            {meta}
          </AppText>
        ) : null}
      </View>
      {hint ? (
        <AppText variant="caption" tone="muted" style={styles.hint}>
          {hint}
        </AppText>
      ) : null}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    root: { gap: t.space.sm },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: t.space.md,
    },
    hint: { marginTop: -t.space.xs },
    body: { gap: t.space.sm },
  });
