import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import { freezeFrameCommand, parseFreezeFrame, type FreezeFrameEntry } from '@/lib/obd/freeze-frame';
import { formatPidValue } from '@/lib/obd/pids';
import { colors, fonts, radius, spacing } from '@/theme';

/** The snapshot the ECU keeps is limited to emissions-relevant sensors. */
const FRAME_PIDS = ['0C', '0D', '05', '04', '11', '0F', '0B', '10', '06', '07', '03', '0E', '1F', '2F'];

export function FreezeFrameScreen() {
  const { client, supportedPids } = useObdConnection();
  const [entries, setEntries] = useState<FreezeFrameEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState(false);

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    setEmpty(false);

    const found: FreezeFrameEntry[] = [];
    const pids = FRAME_PIDS.filter((pid) => supportedPids.length === 0 || supportedPids.includes(pid));

    for (const pid of pids) {
      try {
        const response = await client.query(freezeFrameCommand(pid), 3000);
        if (!response.ok) continue;
        const entry = parseFreezeFrame(response.hex, pid);
        if (entry) found.push(entry);
      } catch {
        continue;
      }
    }

    setEntries(found);
    setEmpty(found.length === 0);
    setLoading(false);
  }, [client, supportedPids]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Freeze frame</Text>
        <Text style={styles.subtitle}>Conditions recorded when the fault set</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {loading ? <Text style={styles.status}>Reading snapshot…</Text> : null}

        {!loading && empty ? (
          <Text style={styles.status}>
            No freeze frame stored. The ECU only records one when an emissions-related code sets.
          </Text>
        ) : null}

        {entries.map((entry) => (
          <View key={entry.definition.pid} style={styles.row}>
            <Text style={styles.name}>{entry.definition.name}</Text>
            <Text style={styles.value}>
              {entry.text ?? formatPidValue(entry.definition, entry.value)}
              {entry.definition.unit && !entry.text ? ` ${entry.definition.unit}` : ''}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Refresh" onPress={load} variant="secondary" disabled={loading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: spacing.lg, paddingBottom: spacing.md, gap: 2 },
  title: { fontFamily: fonts.display, fontSize: 30, fontWeight: '700', color: colors.readout },
  subtitle: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1, color: colors.dim },
  body: { gap: spacing.xs, paddingBottom: spacing.lg },
  status: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.dim, paddingVertical: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.panel,
    borderRadius: radius.sm,
  },
  name: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.readout },
  value: {
    fontFamily: fonts.mono,
    fontSize: 14,
    color: colors.amber,
    fontVariant: ['tabular-nums'],
  },
  footer: { paddingVertical: spacing.md },
});
