import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Meter } from '@/components/meter';
import { Pill } from '@/components/pill';
import { AppText } from '@/components/text';
import {
  FAMILY_LABELS,
  MONITOR_CONFIDENCE_LABELS,
  type MonitorFamily,
  type MonitorTest,
} from '@/lib/obd/mode06';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

/**
 * The value and what it is judged against, in one sentence.
 *
 * The limit wording follows what the car actually supplied. A test with only a
 * ceiling used to render as "allowed 0.00-200.00", which put a floor on it
 * that nothing in the reply ever claimed.
 */
export function describeLimit(test: MonitorTest): string {
  const value = `${test.value.toFixed(2)}${test.unit ? ` ${test.unit}` : ''}`;
  const suffix = test.scaled ? '' : ' (raw counts)';

  switch (test.limit) {
    case 'both':
      return `${value} · allowed ${test.min.toFixed(2)}–${test.max.toFixed(2)}${suffix}`;
    case 'upper':
      return `${value} · must stay below ${test.max.toFixed(2)}${suffix}`;
    case 'lower':
      return `${value} · must stay above ${test.min.toFixed(2)}${suffix}`;
    case 'none':
      return `${value} · no limit reported${suffix}`;
  }
}

export function TestRow({ test }: { test: MonitorTest }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <AppText variant="body" style={styles.rowName} numberOfLines={1}>
          {test.monitorName}
        </AppText>
        <AppText variant="eyebrow" style={{ color: test.passed ? theme.color.ok : theme.color.danger }}>
          {test.passed ? 'Pass' : 'Fail'}
        </AppText>
      </View>

      <AppText variant="caption" tone="faint">
        {test.testName} · {describeLimit(test)}
      </AppText>

      {/* Where the value sits between its limits is the reason to read mode 06
          at all: a test passing at 96% of its ceiling is the finding, and a
          bare "Pass" throws it away. Only drawable with two bounds. */}
      {test.fraction !== null ? (
        <Meter
          fraction={test.fraction}
          color={test.passed ? theme.color.ok : theme.color.danger}
          height={3}
        />
      ) : null}

      {test.confidence !== 'named' ? (
        <View style={styles.provenance}>
          <Pill
            label={MONITOR_CONFIDENCE_LABELS[test.confidence]}
            color={theme.color.inkFaint}
            background={theme.color.surfaceSunken}
          />
        </View>
      ) : null}
    </View>
  );
}

export function TestGroup({ family, tests }: { family: MonitorFamily; tests: MonitorTest[] }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [open, setOpen] = useState(false);

  const failed = tests.filter((test) => !test.passed).length;

  return (
    <View>
      <Pressable
        onPress={() => setOpen((wasOpen) => !wasOpen)}
        style={styles.groupHead}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <MaterialCommunityIcons
          name={open ? 'chevron-down' : 'chevron-right'}
          size={20}
          color={theme.color.inkFaint}
        />
        <AppText variant="body" style={styles.rowName} numberOfLines={1}>
          {FAMILY_LABELS[family]}
        </AppText>
        <AppText
          variant="eyebrow"
          style={{ color: failed > 0 ? theme.color.danger : theme.color.inkFaint }}
        >
          {failed > 0 ? `${failed} failing` : `${tests.length}`}
        </AppText>
      </Pressable>

      {open ? (
        <View style={styles.groupBody}>
          {tests.map((test) => (
            <TestRow key={`${test.monitorId}-${test.testId}`} test={test} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    row: {
      gap: t.space.xs,
      paddingVertical: t.space.md,
      borderBottomWidth: t.size.hairline,
      borderBottomColor: t.color.rule,
    },
    rowHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: t.space.md,
    },
    rowName: { flex: 1 },
    provenance: { marginTop: t.space.xxs },
    groupHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space.sm,
      minHeight: t.size.touch,
      borderBottomWidth: t.size.hairline,
      borderBottomColor: t.color.rule,
    },
    groupBody: { paddingLeft: t.space.xl },
  });
