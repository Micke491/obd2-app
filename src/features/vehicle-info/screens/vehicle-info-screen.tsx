import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import { getPidDefinition } from '@/lib/obd/pids';
import { extractPayload } from '@/lib/obd/protocol';
import {
  INFO_CALIBRATION_ID,
  INFO_ECU_NAME,
  describeProtocol,
  parseCvn,
  parseInfoText,
  parseVin,
} from '@/lib/obd/vehicle-info';
import { colors, fonts, radius, spacing } from '@/theme';

type InfoRow = { label: string; value: string };

export function VehicleInfoScreen() {
  const { client, device, supportedPids } = useObdConnection();
  const [rows, setRows] = useState<InfoRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);

    const collected: InfoRow[] = [];

    const readText = async (command: string, label: string, parse: (hex: string) => string | null) => {
      try {
        const response = await client.query(command, 6000);
        if (!response.ok) return;
        const value = parse(response.hex);
        if (value) collected.push({ label, value });
      } catch {
        // A field the vehicle does not publish is simply omitted.
      }
    };

    try {
      const protocol = await client.sendCommand('ATDPN', 3000);
      collected.push({ label: 'Protocol', value: describeProtocol(protocol) });
    } catch {
      // Protocol is cosmetic; omit if the adapter will not report it.
    }

    await readText('0902', 'VIN', parseVin);
    await readText('0904', 'Calibration ID', (hex) => parseInfoText(hex, INFO_CALIBRATION_ID));
    await readText('0906', 'Calibration verification', parseCvn);
    await readText('090A', 'ECU name', (hex) => parseInfoText(hex, INFO_ECU_NAME));

    // PID 1C names the standard the ECU claims conformance with.
    if (supportedPids.length === 0 || supportedPids.includes('1C')) {
      try {
        const response = await client.query('011C', 3000);
        const definition = getPidDefinition('1C');
        if (response.ok && definition?.describe) {
          const payload = extractPayload(response.hex, '41', '1C');
          if (payload && payload.length >= 1) {
            collected.push({ label: 'OBD standard', value: definition.describe(payload) ?? 'Unknown' });
          }
        }
      } catch {
        // Optional.
      }
    }

    if (device?.name) collected.push({ label: 'Adapter', value: device.name });
    collected.push({ label: 'Sensors reported', value: String(supportedPids.length) });

    setRows(collected);
    setLoading(false);
  }, [client, device, supportedPids]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Vehicle</Text>
        <Text style={styles.subtitle}>Identification and connection</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {loading && rows.length === 0 ? <Text style={styles.status}>Reading…</Text> : null}

        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <Text style={styles.label}>{row.label}</Text>
            <Text style={styles.value} selectable numberOfLines={2}>
              {row.value}
            </Text>
          </View>
        ))}

        {!loading && rows.length === 0 ? (
          <Text style={styles.status}>This vehicle did not report any identification data.</Text>
        ) : null}

        <Text style={styles.note}>
          ABS, airbag and transmission modules use manufacturer-specific protocols and are not
          reachable over generic OBD-II.
        </Text>
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
  row: {
    gap: 4,
    padding: spacing.md,
    backgroundColor: colors.panel,
    borderRadius: radius.sm,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.dim,
  },
  value: {
    fontFamily: fonts.mono,
    fontSize: 14,
    color: colors.readout,
    letterSpacing: 0.5,
  },
  status: { fontFamily: fonts.body, fontSize: 13, color: colors.dim, paddingVertical: spacing.md },
  note: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: colors.dim,
    marginTop: spacing.lg,
  },
  footer: { paddingVertical: spacing.md },
});
