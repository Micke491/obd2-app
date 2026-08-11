import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Card } from '@/components/card';
import { Pill } from '@/components/pill';
import { AppText } from '@/components/text';
import { resolveDtcDetail } from '@/lib/obd/dtc';
import { faultLabel, type ModuleFault } from '@/lib/obd/uds/faults';
import { PART_LABELS } from '@/lib/obd/uds/parts';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

import { formatLastSeen, moduleFaultState, type DiscoveredModule } from '../lib/module-map';

/**
 * One discovered module: what kind of part it is, whether it is still
 * answering, and what it is storing.
 *
 * A module that answered with nothing wrong is shown collapsed -- there is no
 * fault list to render, so the card is naturally shorter than one with
 * something to say. "The airbag module is fine" is an answer worth having.
 */
export function ModuleGroup({ module, faults }: { module: DiscoveredModule; faults: ModuleFault[] }) {
  const router = useRouter();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const state = moduleFaultState(module, faults);

  const tint =
    state.kind === 'asleep'
      ? { color: theme.color.inkFaint, background: theme.color.surfaceSunken }
      : state.kind === 'faults' && state.failingNow
        ? { color: theme.color.danger, background: theme.color.dangerWash }
        : state.kind === 'faults'
          ? { color: theme.color.warn, background: theme.color.warnWash }
          : state.kind === 'clean'
            ? { color: theme.color.ok, background: theme.color.okWash }
            : { color: theme.color.inkMuted, background: theme.color.surfaceSunken };

  const badgeLabel =
    state.kind === 'faults'
      ? `${state.count} fault${state.count === 1 ? '' : 's'}`
      : state.kind === 'clean'
        ? 'No faults'
        : state.kind === 'unreadable'
          ? `${state.count} unread`
          : state.kind === 'asleep'
            ? 'Asleep'
            : 'Unknown';

  return (
    <Card spine={tint.color}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <AppText variant="subheading">{PART_LABELS[module.part]}</AppText>
          <AppText variant="caption" tone="muted">
            {module.name ?? 'No name reported'}
          </AppText>
        </View>
        <Pill label={badgeLabel} color={tint.color} background={tint.background} />
      </View>

      <View style={styles.metaRow}>
        <AppText variant="mono" tone="faint">
          {module.requestId}
        </AppText>
        {module.stale ? (
          <AppText variant="caption" tone="faint">
            Asleep since {formatLastSeen(module.lastSeenAt)}
          </AppText>
        ) : null}
      </View>

      {state.kind === 'faults' ? (
        <View style={styles.faultList}>
          {faults.map((fault) => {
            const detail = resolveDtcDetail(fault.code);
            return (
              <Pressable
                key={faultLabel(fault)}
                onPress={() => router.push(`/code/${fault.code}`)}
                accessibilityRole="button"
                accessibilityLabel={`${fault.code}. ${detail.title}`}
                style={({ pressed }) => [styles.faultRow, pressed && styles.faultRowPressed]}
              >
                <View style={styles.faultText}>
                  <View style={styles.faultHead}>
                    <AppText variant="mono">{faultLabel(fault)}</AppText>
                    {fault.status.failingNow ? (
                      <Pill label="Happening now" color={theme.color.danger} background={theme.color.dangerWash} filled />
                    ) : null}
                  </View>
                  <AppText variant="body" numberOfLines={1}>
                    {detail.title}
                  </AppText>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={theme.color.inkFaint} />
              </Pressable>
            );
          })}
        </View>
      ) : state.kind === 'clean' ? (
        <View style={styles.clean}>
          <MaterialCommunityIcons name="check-circle-outline" size={16} color={theme.color.ok} />
          <AppText variant="caption" tone="ok">
            No faults reported
          </AppText>
        </View>
      ) : state.kind === 'unreadable' ? (
        <AppText variant="caption" tone="muted" style={styles.note}>
          Reported {state.count} fault{state.count === 1 ? '' : 's'}, but would not list them.
        </AppText>
      ) : state.kind === 'unknown' ? (
        <AppText variant="caption" tone="muted" style={styles.note}>
          Present, but would not say what it is storing.
        </AppText>
      ) : null}
    </Card>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: t.space.md },
    headText: { flex: 1, gap: 1 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm, marginTop: t.space.sm },
    clean: { flexDirection: 'row', alignItems: 'center', gap: t.space.xs, marginTop: t.space.md },
    note: { marginTop: t.space.md },
    faultList: {
      gap: t.space.xs,
      marginTop: t.space.md,
      paddingTop: t.space.md,
      borderTopWidth: t.size.hairline,
      borderTopColor: t.color.rule,
    },
    faultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.space.sm,
      paddingVertical: t.space.sm,
    },
    faultRowPressed: { opacity: 0.7 },
    faultText: { flex: 1, gap: 2 },
    faultHead: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
  });
