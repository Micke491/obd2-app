import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { FieldRow } from '@/components/rows';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
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
import { useThemedStyles, type Theme } from '@/theme';

type InfoRow = { label: string; value: string; hint?: string };

export function VehicleInfoScreen() {
  const styles = useThemedStyles(createStyles);
  const { client, device, supportedPids } = useObdConnection();
  const [rows, setRows] = useState<InfoRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!client) return;
    setLoading(true);

    const collected: InfoRow[] = [];

    const readText = async (
      command: string,
      label: string,
      parse: (hex: string) => string | null,
      hint?: string,
    ) => {
      try {
        const response = await client.query(command, 6000);
        if (!response.ok) return;
        const value = parse(response.hex);
        if (value) collected.push({ label, value, hint });
      } catch {
        // A field the vehicle does not publish is simply omitted.
      }
    };

    try {
      const protocol = await client.sendCommand('ATDPN', 3000);
      collected.push({
        label: 'Protocol',
        value: describeProtocol(protocol),
        hint: 'The electrical standard the car and adapter agreed on',
      });
    } catch {
      // Protocol is cosmetic; omit if the adapter will not report it.
    }

    await readText('0902', 'VIN', parseVin, 'The car’s 17-character identity');
    await readText(
      '0904',
      'Calibration ID',
      (hex) => parseInfoText(hex, INFO_CALIBRATION_ID),
      'Which software version the engine computer is running',
    );
    await readText(
      '0906',
      'Calibration verification',
      parseCvn,
      'A checksum a garage can use to prove the software is untampered',
    );
    await readText('090A', 'ECU name', (hex) => parseInfoText(hex, INFO_ECU_NAME));

    // PID 1C names the standard the ECU claims conformance with.
    if (supportedPids.length === 0 || supportedPids.includes('1C')) {
      try {
        const response = await client.query('011C', 3000);
        const definition = getPidDefinition('1C');
        if (response.ok && definition?.describe) {
          const payload = extractPayload(response.hex, '41', '1C');
          if (payload && payload.length >= 1) {
            collected.push({
              label: 'OBD standard',
              value: definition.describe(payload) ?? 'Unknown',
              hint: 'Which regional emissions standard this car conforms to',
            });
          }
        }
      } catch {
        // Optional.
      }
    }

    if (device?.name) collected.push({ label: 'Adapter', value: device.name });
    collected.push({
      label: 'Sensors reported',
      value: `${supportedPids.length} readings available`,
    });

    setRows(collected);
    setLoading(false);
  }, [client, device, supportedPids]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen edges={{ top: false }}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {loading && rows.length === 0 ? (
          <AppText variant="caption" tone="muted">
            Reading…
          </AppText>
        ) : null}

        <View style={styles.list}>
          {rows.map((row) => (
            <FieldRow key={row.label} label={row.label}>
              <AppText variant="mono" style={styles.value} selectable numberOfLines={2}>
                {row.value}
              </AppText>
              {row.hint ? (
                <AppText variant="caption" tone="faint">
                  {row.hint}
                </AppText>
              ) : null}
            </FieldRow>
          ))}
        </View>

        {!loading && rows.length === 0 ? (
          <AppText variant="body" tone="muted">
            This car did not report any identification data. Some older vehicles simply do not
            publish it, which is not a fault.
          </AppText>
        ) : null}

        <AppText variant="caption" tone="faint" style={styles.note}>
          ABS, airbag and comfort modules speak manufacturer-specific protocols and cannot be
          reached over generic OBD-II, so a warning light for one of those will not appear anywhere
          in this app.
        </AppText>
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
    list: { gap: t.space.sm },
    value: { fontSize: 15, color: t.color.ink, letterSpacing: 0.5 },
    note: { paddingTop: t.space.md },
    footer: { paddingVertical: t.space.md },
  });
