import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { colors, fonts, radius, spacing } from '@/theme';

import { LinkStatus } from '../components/link-status';
import { useObdConnection } from '../hooks/use-obd-connection';

export function ConnectScreen() {
  const router = useRouter();
  const { status, adapter, ecu, error, progress, device, connect } = useObdConnection();

  const connecting = status === 'connecting';

  useEffect(() => {
    if (status === 'connected') router.replace('/(tabs)');
  }, [status, router]);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>OBD-II</Text>
        <Text style={styles.title}>Scanner</Text>
      </View>

      <View style={styles.links}>
        <LinkStatus
          label="Adapter"
          hint={device?.name ? device.name : 'ELM327 over Bluetooth'}
          state={adapter}
        />
        <LinkStatus label="Vehicle ECU" hint="Engine control unit" state={ecu} />
      </View>

      <View style={styles.message}>
        {connecting && progress ? <Text style={styles.progress}>{progress}</Text> : null}
        {!connecting && error ? <Text style={styles.error}>{error}</Text> : null}
        {!connecting && !error ? (
          <Text style={styles.hint}>
            Turn the ignition on and plug the adapter into the OBD-II port, then connect.
          </Text>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Button
          label={connecting ? 'Connecting' : 'Connect'}
          onPress={connect}
          disabled={connecting}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.xxl,
    gap: spacing.xs,
  },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 5,
    color: colors.amber,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 44,
    fontWeight: '700',
    color: colors.readout,
    letterSpacing: -1,
  },
  links: {
    marginTop: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  message: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  progress: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.amber,
    textAlign: 'center',
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.redline,
    textAlign: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.redline,
    borderRadius: radius.md,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.dim,
    textAlign: 'center',
  },
  footer: {
    paddingBottom: spacing.lg,
  },
});
