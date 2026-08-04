import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing } from '@/theme';
import type { LinkState } from '../types';

const STATE_LABEL: Record<LinkState, string> = {
  idle: 'Not connected',
  pending: 'Connecting',
  ready: 'Connected',
  failed: 'Failed',
};

const STATE_COLOR: Record<LinkState, string> = {
  idle: colors.dim,
  pending: colors.amber,
  ready: colors.live,
  failed: colors.redline,
};

type LinkStatusProps = {
  label: string;
  hint: string;
  state: LinkState;
};

export function LinkStatus({ label, hint, state }: LinkStatusProps) {
  const tint = STATE_COLOR[state];

  return (
    <View style={styles.row}>
      <View style={styles.indicator}>
        {state === 'pending' ? (
          <ActivityIndicator size="small" color={tint} />
        ) : (
          <View style={[styles.dot, { backgroundColor: tint }]} />
        )}
      </View>

      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>

      <Text style={[styles.state, { color: tint }]}>{STATE_LABEL[state]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  indicator: {
    width: 20,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.readout,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dim,
  },
  state: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
