import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import type { Dtc } from '@/lib/obd/dtc';
import { TOUCH_TARGET, colors, fonts, radius, spacing } from '@/theme';

import { useTroubleCodes, type DtcGroup } from '../hooks/use-trouble-codes';

const GROUP_LABELS: Record<DtcGroup, { title: string; hint: string }> = {
  stored: { title: 'Stored', hint: 'Confirmed faults that turned the light on' },
  pending: { title: 'Pending', hint: 'Seen once, not yet confirmed' },
  permanent: { title: 'Permanent', hint: 'Cleared only by the ECU, after repair' },
};

export function CodesScreen() {
  const router = useRouter();
  const { client } = useObdConnection();
  const { codes, loading, error, unsupported, refresh, clearCodes } = useTroubleCodes(client);

  const total = codes.stored.length + codes.pending.length + codes.permanent.length;

  const confirmClear = () => {
    Alert.alert(
      'Clear trouble codes?',
      'This erases stored and pending codes and turns off the check engine light.\n\n' +
        'It also resets all readiness monitors. Until they run again — which can take days of ' +
        'driving — the car will fail an emissions test. The fault itself is not repaired, and ' +
        'the code returns if the problem is still present.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear codes', style: 'destructive', onPress: () => void clearCodes() },
      ],
    );
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Trouble codes</Text>
        <Text style={styles.subtitle}>
          {loading ? 'Reading…' : total === 0 ? 'No codes found' : `${total} code${total === 1 ? '' : 's'}`}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {(Object.keys(GROUP_LABELS) as DtcGroup[]).map((group) => (
          <View key={group} style={styles.group}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>{GROUP_LABELS[group].title}</Text>
              <Text style={styles.groupCount}>{codes[group].length}</Text>
            </View>
            <Text style={styles.groupHint}>{GROUP_LABELS[group].hint}</Text>

            {unsupported.includes(group) ? (
              <Text style={styles.unsupported}>Not supported by this vehicle</Text>
            ) : codes[group].length === 0 ? (
              <Text style={styles.none}>None</Text>
            ) : (
              codes[group].map((dtc) => <CodeRow key={`${group}-${dtc.code}`} dtc={dtc} />)
            )}
          </View>
        ))}

        <View style={styles.links}>
          <LinkRow label="Freeze frame" hint="Sensor snapshot from when the code set" onPress={() => router.push('/freeze-frame')} />
          <LinkRow label="Monitors" hint="Readiness and on-board test results" onPress={() => router.push('/monitors')} />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerButton}>
          <Button label="Refresh" onPress={refresh} variant="secondary" disabled={loading} />
        </View>
        <View style={styles.footerButton}>
          <Button label="Clear codes" onPress={confirmClear} variant="danger" disabled={loading} />
        </View>
      </View>
    </Screen>
  );
}

function CodeRow({ dtc }: { dtc: Dtc }) {
  return (
    <View style={styles.codeRow}>
      <Text style={styles.code}>{dtc.code}</Text>
      <View style={styles.codeText}>
        <Text style={styles.codeDescription}>
          {dtc.description ?? (dtc.manufacturerSpecific ? 'Manufacturer-specific code' : 'No description available')}
        </Text>
        <Text style={styles.codeCategory}>
          {dtc.category}
          {dtc.manufacturerSpecific ? ' · manufacturer' : ' · generic'}
        </Text>
      </View>
    </View>
  );
}

function LinkRow({ label, hint, onPress }: { label: string; hint: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.linkRow, pressed && styles.rowPressed]}
    >
      <View style={styles.codeText}>
        <Text style={styles.linkLabel}>{label}</Text>
        <Text style={styles.codeCategory}>{hint}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: 2,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    fontWeight: '700',
    color: colors.readout,
  },
  subtitle: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.dim,
  },
  body: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.redline,
  },
  group: {
    gap: spacing.xs,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupTitle: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.amber,
  },
  groupCount: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.dim,
  },
  groupHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dim,
    marginBottom: spacing.xs,
  },
  none: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dim,
  },
  unsupported: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dim,
    fontStyle: 'italic',
  },
  codeRow: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.panel,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
  },
  code: {
    fontFamily: fonts.mono,
    fontSize: 15,
    fontWeight: '700',
    color: colors.redline,
    letterSpacing: 0.5,
  },
  codeText: {
    flex: 1,
    gap: 2,
  },
  codeDescription: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 19,
    color: colors.readout,
  },
  codeCategory: {
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.dim,
  },
  links: {
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    paddingTop: spacing.lg,
  },
  linkRow: {
    minHeight: TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.panel,
    borderRadius: radius.sm,
  },
  rowPressed: {
    backgroundColor: colors.panelActive,
  },
  linkLabel: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.readout,
  },
  chevron: {
    fontFamily: fonts.body,
    fontSize: 22,
    color: colors.dim,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  footerButton: {
    flex: 1,
  },
});
