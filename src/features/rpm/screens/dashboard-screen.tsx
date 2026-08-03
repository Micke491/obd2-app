import { StyleSheet, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import { colors, fonts, spacing } from '@/theme';

import { RpmGauge } from '../components/rpm-gauge';
import { useRpm } from '../hooks/use-rpm';

export function DashboardScreen() {
  const router = useRouter();
  const { client, device, disconnect } = useObdConnection();
  const { rpm, error, samples } = useRpm(client);

  // Covers a direct deep link, a dropped adapter, and the disconnect below.
  // The connect screen surfaces the reason, so no message is needed here.
  if (!client) return <Redirect href="/" />;

  const handleDisconnect = async () => {
    await disconnect();
    router.replace('/');
  };

  return (
    <Screen>
      <View style={styles.status}>
        <View style={styles.statusLeft}>
          <View style={[styles.dot, { backgroundColor: samples > 0 ? colors.live : colors.dim }]} />
          <Text style={styles.statusText}>{samples > 0 ? 'LIVE' : 'WAITING'}</Text>
        </View>
        <Text style={styles.statusDevice} numberOfLines={1}>
          {device?.name ?? 'Adapter'}
        </Text>
      </View>

      <View style={styles.readout}>
        <RpmGauge rpm={rpm} />
      </View>

      <View style={styles.footer}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!error && samples === 0 ? (
          <Text style={styles.hint}>Connected. Start the engine to see engine speed.</Text>
        ) : null}
        {samples > 0 ? <Text style={styles.samples}>{samples} readings</Text> : null}

        <Button label="Disconnect" onPress={handleDisconnect} variant="danger" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.dim,
  },
  statusDevice: {
    flexShrink: 1,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.dim,
  },
  readout: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.redline,
    textAlign: 'center',
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.dim,
    textAlign: 'center',
  },
  samples: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.dim,
    textAlign: 'center',
  },
});
