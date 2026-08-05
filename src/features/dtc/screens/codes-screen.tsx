import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { Pill } from '@/components/pill';
import { NavRow } from '@/components/rows';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { AppText } from '@/components/text';
import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import { SEVERITY_LABELS, resolveDtcDetail, type DtcDetail, type DtcSeverity } from '@/lib/obd/dtc';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

import { DRIVE_ICON, driveTint, severityTint } from '../components/severity';
import { useTroubleCodes, type DtcGroup, type ReportedFaults } from '../hooks/use-trouble-codes';

const GROUPS: { key: DtcGroup; title: string; hint: string }[] = [
  { key: 'stored', title: 'Confirmed', hint: 'Faults the car is sure about — these turned the light on.' },
  { key: 'pending', title: 'Pending', hint: 'Seen once. The car is waiting to see them again before confirming.' },
  { key: 'permanent', title: 'Permanent', hint: 'Only the car can clear these, and only after a real repair.' },
];

const SEVERITY_RANK: Record<DtcSeverity, number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3,
  informational: 4,
};

const bySeverity = (a: DtcDetail, b: DtcDetail) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];

/**
 * What the engine computer says about itself, shown next to what was read out
 * of it. The two are worth stating together: a list of faults on a car whose
 * warning light is off is the first thing a driver disbelieves, and being able
 * to see both makes it checkable rather than a matter of trust.
 */
function reportedSummary(reported: ReportedFaults, stored: number): string {
  const light = reported.milOn
    ? 'The check engine light is on'
    : 'The check engine light is off';

  const tally =
    reported.count === 0
      ? 'the engine computer has no faults stored'
      : `the engine computer has ${reported.count} fault${reported.count === 1 ? '' : 's'} stored`;

  // Other control units keep their own faults, and the engine computer does not
  // count those — so a difference here is ordinary, not a contradiction.
  const note =
    reported.count === stored
      ? ''
      : ' Other control units keep their own faults, which this count leaves out.';

  return `${light} and ${tally}.${note}`;
}

export function CodesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { client } = useObdConnection();
  const { codes, loading, error, unsupported, reported, refresh, clearCodes } =
    useTroubleCodes(client);

  const resolved = useMemo(() => {
    const out: Record<DtcGroup, DtcDetail[]> = { stored: [], pending: [], permanent: [] };
    for (const group of ['stored', 'pending', 'permanent'] as DtcGroup[]) {
      // Worst first, so the thing that matters is the thing you read.
      out[group] = codes[group].map((dtc) => resolveDtcDetail(dtc.code)).sort(bySeverity);
    }
    return out;
  }, [codes]);

  const total = resolved.stored.length + resolved.pending.length + resolved.permanent.length;
  const worst = useMemo(
    () => [...resolved.stored, ...resolved.pending, ...resolved.permanent].sort(bySeverity)[0] ?? null,
    [resolved],
  );

  const confirmClear = () => {
    Alert.alert(
      'Clear the trouble codes?',
      'This erases the confirmed and pending codes and turns the check engine light off.\n\n' +
        'It also resets every readiness monitor. Until those finish running again — which can ' +
        'take several days of mixed driving — the car will fail an emissions test.\n\n' +
        'Nothing is repaired by doing this. If the fault is still there, the code comes back.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear codes', style: 'destructive', onPress: () => void clearCodes() },
      ],
    );
  };

  return (
    <Screen>
      <ScreenHeader
        eyebrow="Diagnostics"
        title="Trouble codes"
        status={
          loading
            ? 'Reading the car…'
            : total === 0
              ? 'Nothing stored'
              : `${total} code${total === 1 ? '' : 's'} found`
        }
      />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {error ? (
          <Card spine={theme.color.danger}>
            <AppText variant="body" tone="danger">
              {error}
            </AppText>
          </Card>
        ) : null}

        {!loading && reported ? (
          <AppText variant="caption" tone="muted">
            {reportedSummary(reported, resolved.stored.length)}
          </AppText>
        ) : null}

        {worst ? (
          <Card spine={driveTint(worst.drive, theme)}>
            <View style={styles.summaryHead}>
              <MaterialCommunityIcons
                name={DRIVE_ICON[worst.drive]}
                size={20}
                color={driveTint(worst.drive, theme)}
              />
              <AppText variant="eyebrow" tone="muted">
                Most urgent right now
              </AppText>
            </View>
            <AppText variant="body" style={styles.summaryText}>
              {worst.driveNote}
            </AppText>
          </Card>
        ) : null}

        {!loading && total === 0 && unsupported.length < GROUPS.length ? (
          <EmptyState
            icon="check-decagram-outline"
            tone="good"
            title="No trouble codes"
            body="Your car is not reporting any faults. If a warning light is on anyway, it may come from a system a generic scanner cannot reach, such as ABS or the airbags."
          />
        ) : null}

        {GROUPS.map((group) => {
          const list = resolved[group.key];
          const isUnsupported = unsupported.includes(group.key);
          if (list.length === 0 && !isUnsupported) return null;

          return (
            <View key={group.key} style={styles.group}>
              <View style={styles.groupHead}>
                <AppText variant="eyebrow" tone="accent">
                  {group.title}
                </AppText>
                <AppText variant="eyebrow" tone="faint">
                  {isUnsupported ? 'Not supported' : `${list.length}`}
                </AppText>
              </View>
              <AppText variant="caption" tone="muted">
                {isUnsupported ? 'This car does not answer requests for this list.' : group.hint}
              </AppText>

              <View style={styles.list}>
                {list.map((detail) => (
                  <CodeCard
                    key={`${group.key}-${detail.code}`}
                    detail={detail}
                    onPress={() => router.push(`/code/${detail.code}`)}
                  />
                ))}
              </View>
            </View>
          );
        })}

        <View style={styles.links}>
          <NavRow
            icon="camera-timer"
            label="Freeze frame"
            hint="The sensor readings saved when a fault was recorded"
            onPress={() => router.push('/freeze-frame')}
          />
          <NavRow
            icon="clipboard-check-outline"
            label="Readiness monitors"
            hint="Which self-tests the car has finished running"
            onPress={() => router.push('/monitors')}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerButton}>
          <Button
            label="Read again"
            onPress={() => void refresh()}
            variant="secondary"
            busy={loading}
            icon="refresh"
          />
        </View>
        <View style={styles.footerButton}>
          <Button
            label="Clear codes"
            onPress={confirmClear}
            variant="danger"
            disabled={loading || total === 0}
          />
        </View>
      </View>
    </Screen>
  );
}

function CodeCard({ detail, onPress }: { detail: DtcDetail; onPress: () => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const tint = severityTint(detail.severity, theme);

  return (
    <Card spine={tint.color} onPress={onPress} accessibilityLabel={`${detail.code}. ${detail.title}`}>
      <View style={styles.codeHead}>
        <AppText variant="mono" style={styles.codeText}>
          {detail.code}
        </AppText>
        <Pill
          label={SEVERITY_LABELS[detail.severity]}
          color={tint.color}
          background={tint.wash}
          filled={detail.severity === 'critical'}
        />
      </View>

      <AppText variant="subheading" style={styles.codeTitle}>
        {detail.title}
      </AppText>
      <AppText variant="caption" tone="muted" numberOfLines={2}>
        {detail.meaning}
      </AppText>

      <View style={styles.codeFoot}>
        <AppText variant="caption" style={{ color: driveTint(detail.drive, theme) }}>
          {detail.drive === 'safe-to-drive' ? 'Safe to drive' : 'Read the drive advice'}
        </AppText>
        <MaterialCommunityIcons name="chevron-right" size={18} color={theme.color.inkFaint} />
      </View>
    </Card>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    body: { gap: t.space.xl, paddingBottom: t.space.xl },
    summaryHead: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
    summaryText: { marginTop: t.space.sm },
    group: { gap: t.space.xs },
    groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    list: { gap: t.space.sm, marginTop: t.space.sm },
    codeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    codeText: { fontSize: 17, letterSpacing: 1 },
    codeTitle: { marginTop: t.space.sm, marginBottom: 2 },
    codeFoot: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: t.space.md,
      paddingTop: t.space.md,
      borderTopWidth: t.size.hairline,
      borderTopColor: t.color.rule,
    },
    links: {
      gap: t.space.sm,
      paddingTop: t.space.lg,
      borderTopWidth: t.size.hairline,
      borderTopColor: t.color.rule,
    },
    footer: { flexDirection: 'row', gap: t.space.sm, paddingVertical: t.space.md },
    footerButton: { flex: 1 },
  });
