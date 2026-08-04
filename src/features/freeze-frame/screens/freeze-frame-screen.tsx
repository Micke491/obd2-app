import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import { useUnits } from '@/hooks/use-units';
import { freezeFrameCommand, parseFreezeFrame, type FreezeFrameEntry } from '@/lib/obd/freeze-frame';
import { useThemedStyles, type Theme } from '@/theme';

/** The snapshot the ECU keeps is limited to emissions-relevant sensors. */
const FRAME_PIDS = ['0C', '0D', '05', '04', '11', '0F', '0B', '10', '06', '07', '03', '0E', '1F', '2F'];

export function FreezeFrameScreen() {
  const styles = useThemedStyles(createStyles);
  const { client, supportedPids } = useObdConnection();
  const { format } = useUnits();
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
    <Screen edges={{ top: false }}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <AppText variant="body" tone="muted">
            When the car records an emissions fault it saves a snapshot of what every sensor was
            reading at that exact moment. Reading it back is often the fastest way to tell whether
            a fault happened cold, hot, at idle or under load.
          </AppText>
        </View>

        {loading && entries.length === 0 ? (
          <AppText variant="caption" tone="muted" style={styles.status}>
            Reading the snapshot…
          </AppText>
        ) : null}

        {!loading && empty ? (
          <EmptyState
            icon="camera-off-outline"
            title="No snapshot stored"
            body="The car only records a freeze frame when an emissions-related code sets. Nothing stored usually means nothing has gone wrong."
          />
        ) : null}

        {entries.length ? (
          <View style={styles.list}>
            {entries.map((entry) => {
              const measurement = format(entry.definition, entry.value);
              return (
                <View key={entry.definition.pid} style={styles.row}>
                  <AppText variant="body" style={styles.name} numberOfLines={2}>
                    {entry.definition.name}
                  </AppText>
                  <AppText variant="mono" style={styles.value}>
                    {entry.text ?? measurement.full}
                  </AppText>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Read again" onPress={() => void load()} variant="secondary" busy={loading} icon="refresh" />
      </View>
    </Screen>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    body: { gap: t.space.lg, paddingTop: t.space.lg, paddingBottom: t.space.lg },
    intro: {},
    status: { paddingVertical: t.space.lg },
    list: {},
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: t.space.md,
      paddingVertical: t.space.md,
      borderBottomWidth: t.size.hairline,
      borderBottomColor: t.color.rule,
    },
    name: { flex: 1 },
    value: { fontSize: 15, color: t.color.ink },
    footer: { paddingVertical: t.space.md },
  });
