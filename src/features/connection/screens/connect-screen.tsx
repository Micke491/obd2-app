import { useState } from 'react';
import { ActivityIndicator, FlatList, Linking, StyleSheet, Text, View } from 'react-native';
import RNBluetoothClassic, { type BluetoothDevice } from 'react-native-bluetooth-classic';
import { useRouter } from 'expo-router';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { colors, fonts, radius, spacing } from '@/theme';

import { DeviceListItem } from '../components/device-list-item';
import { looksLikeObdAdapter, useBondedDevices } from '../hooks/use-bonded-devices';
import { useObdConnection } from '../hooks/use-obd-connection';

export function ConnectScreen() {
  const router = useRouter();
  const { devices, loading, error: listError, bluetoothOff, refresh, enableBluetooth } = useBondedDevices();
  const { status, error: connectionError, progress, connect } = useObdConnection();
  const [pendingAddress, setPendingAddress] = useState<string | null>(null);

  const connecting = status === 'connecting' || status === 'initializing';

  const handleConnect = async (device: BluetoothDevice) => {
    setPendingAddress(device.address);
    const connected = await connect(device);
    setPendingAddress(null);
    if (connected) router.replace('/dashboard');
  };

  const openBluetoothSettings = () => {
    try {
      RNBluetoothClassic.openBluetoothSettings();
    } catch {
      // Older adapters of the library no-op here; the intent URL always works.
      void Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS');
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>OBD-II</Text>
        <Text style={styles.title}>Connect adapter</Text>
        <Text style={styles.help}>
          Pair the adapter in Android Bluetooth settings first — most ask for 1234 or 0000. It appears here once paired.
        </Text>
      </View>

      {connecting ? (
        <View style={styles.banner}>
          <ActivityIndicator color={colors.amber} />
          <Text style={styles.bannerText}>
            {status === 'connecting' ? 'Opening connection' : (progress ?? 'Initializing')}
          </Text>
        </View>
      ) : null}

      {connectionError && !connecting ? (
        <View style={[styles.banner, styles.bannerError]}>
          <Text style={styles.bannerErrorText}>{connectionError}</Text>
        </View>
      ) : null}

      {bluetoothOff ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Bluetooth is off</Text>
          <Text style={styles.emptyBody}>Turn it on to reach the adapter.</Text>
          <View style={styles.emptyAction}>
            <Button label="Turn on Bluetooth" onPress={enableBluetooth} />
          </View>
        </View>
      ) : null}

      {listError ? <Text style={styles.listError}>{listError}</Text> : null}

      {loading && devices.length === 0 ? (
        <View style={styles.empty}>
          <ActivityIndicator color={colors.dim} />
        </View>
      ) : null}

      {!loading && !bluetoothOff && devices.length === 0 && !listError ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No paired devices</Text>
          <Text style={styles.emptyBody}>Pair your OBD-II adapter in Bluetooth settings, then refresh.</Text>
        </View>
      ) : null}

      <FlatList
        data={devices}
        keyExtractor={(device) => device.address}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <DeviceListItem
            device={item}
            likelyAdapter={looksLikeObdAdapter(item)}
            busy={pendingAddress === item.address}
            disabled={connecting}
            onPress={handleConnect}
          />
        )}
      />

      <View style={styles.footer}>
        <View style={styles.footerButton}>
          <Button label="Refresh" onPress={refresh} variant="secondary" disabled={connecting} />
        </View>
        <View style={styles.footerButton}>
          <Button label="Bluetooth settings" onPress={openBluetoothSettings} variant="secondary" />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 4,
    color: colors.amber,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 34,
    fontWeight: '700',
    color: colors.readout,
    letterSpacing: -0.5,
  },
  help: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.dim,
    marginTop: spacing.xs,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.panel,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  bannerError: {
    borderColor: colors.redline,
  },
  bannerText: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.readout,
  },
  bannerErrorText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.redline,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  listError: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.redline,
    marginBottom: spacing.md,
  },
  empty: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.xs,
  },
  emptyTitle: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.readout,
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.dim,
    textAlign: 'center',
  },
  emptyAction: {
    marginTop: spacing.md,
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
