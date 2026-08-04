import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Button } from '@/components/button';
import { AppText } from '@/components/text';
import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import { useSettings } from '@/features/settings/context/settings-provider';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

import { LinkDot } from './link-dot';

/**
 * Everything about the adapter link in one block, pinned under the grid.
 *
 * The two halves of the connection are tracked separately on purpose: knowing
 * the adapter is fine but the car is not tells you to check the ignition, not
 * the Bluetooth.
 */
export function ConnectPanel() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { status, adapter, ecu, device, error, progress, connect, disconnect } = useObdConnection();
  const { settings } = useSettings();

  const connecting = status === 'connecting';
  const connected = status === 'connected';

  // One attempt per launch, and only when asked for — retrying a failure in a
  // loop would drain the battery of a phone sitting in a car with no adapter.
  const attempted = useRef(false);
  useEffect(() => {
    if (attempted.current) return;
    if (!settings.autoConnectOnLaunch || status !== 'idle') return;
    attempted.current = true;
    void connect(settings.lastAdapterAddress);
  }, [connect, settings.autoConnectOnLaunch, settings.lastAdapterAddress, status]);

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons
            name={connected ? 'bluetooth-connect' : 'bluetooth'}
            size={16}
            color={connected ? theme.color.ok : theme.color.inkMuted}
          />
          <AppText variant="eyebrow" tone={connected ? 'ok' : 'muted'}>
            {connected ? 'Connected' : connecting ? 'Connecting' : 'Not connected'}
          </AppText>
        </View>
        <AppText variant="caption" tone="faint" numberOfLines={1} style={styles.device}>
          {device?.name ?? 'OBD-II adapter'}
        </AppText>
      </View>

      <View style={styles.links}>
        <LinkDot label="Adapter" state={adapter} />
        <LinkDot label="Car" state={ecu} />
      </View>

      {connecting && progress ? (
        <AppText variant="caption" tone="muted">
          {progress}…
        </AppText>
      ) : null}

      {!connecting && error ? (
        <View style={styles.error}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color={theme.color.danger} />
          <AppText variant="caption" tone="danger" style={styles.errorText}>
            {error}
          </AppText>
        </View>
      ) : null}

      {!connecting && !error && !connected ? (
        <AppText variant="caption" tone="muted">
          Turn the ignition on, plug the adapter into the OBD-II port under the dashboard, then
          connect.
        </AppText>
      ) : null}

      <Button
        label={connected ? 'Disconnect' : connecting ? 'Connecting' : 'Connect to OBD-II'}
        onPress={() => void (connected ? disconnect() : connect(settings.lastAdapterAddress))}
        variant={connected ? 'secondary' : 'primary'}
        busy={connecting}
        icon={connected ? 'bluetooth-off' : 'bluetooth'}
      />
    </View>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    panel: {
      gap: t.space.md,
      padding: t.space.lg,
      borderRadius: t.radius.lg,
      borderWidth: t.size.hairline,
      borderColor: t.color.rule,
      backgroundColor: t.color.surface,
      ...t.shadow.card,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: t.space.md,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
    device: { flexShrink: 1, textAlign: 'right' },
    links: { flexDirection: 'row', gap: t.space.xl },
    error: { flexDirection: 'row', gap: t.space.sm, alignItems: 'flex-start' },
    errorText: { flex: 1 },
  });
