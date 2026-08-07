import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import { useSettings } from '@/features/settings/context/settings-provider';
import { useTroubleCodes } from '@/features/dtc/hooks/use-trouble-codes';
import { useKeepAwakeWhen } from '@/hooks/use-keep-awake-when';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

import { ConnectPanel } from '../components/connect-panel';
import { HubCard, type HubCardProps } from '../components/hub-card';

export function HubScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { status, supportedPids, device } = useObdConnection();
  const { settings, update } = useSettings();
  // Only ever reflects a read the driver asked for — the hub never polls the
  // car for faults on its own, and a clear puts this back to knowing nothing.
  const { state: codesState, total: codeTotal, reported } = useTroubleCodes();

  useKeepAwakeWhen(settings.keepAwake);

  const connected = status === 'connected';

  // Remembering the adapter that actually worked turns a garage full of paired
  // devices from a dead end into a silent reconnect next time.
  useEffect(() => {
    if (!connected || !device) return;
    if (settings.lastAdapterAddress === device.address) return;
    update({ lastAdapterAddress: device.address, lastAdapterName: device.name ?? null });
  }, [connected, device, settings.lastAdapterAddress, update]);

  const cards: HubCardProps[] = useMemo(
    () => [
      {
        icon: 'gauge',
        title: 'Dashboard',
        hint: 'Revs, speed and the readings that matter while driving',
        onPress: () => router.push('/dashboard'),
        disabled: !connected,
        badge: connected ? { text: 'Live', tone: 'ok' } : null,
      },
      {
        icon: 'chart-line-variant',
        title: 'Live data',
        hint: 'Your chosen sensors, updating as fast as the adapter allows',
        onPress: () => router.push('/live'),
        disabled: !connected,
        badge: connected ? { text: `${settings.pinnedPids.length} pinned`, tone: 'muted' } : null,
      },
      {
        icon: 'format-list-bulleted-type',
        title: 'All sensors',
        hint: 'Everything this car reports, grouped and searchable',
        onPress: () => router.push('/sensors'),
        disabled: !connected,
        badge: connected && supportedPids.length ? { text: `${supportedPids.length}`, tone: 'muted' } : null,
      },
      {
        icon: 'alert-decagram-outline',
        title: 'Trouble codes',
        hint: 'What the check engine light is actually telling you',
        onPress: () => router.push('/codes'),
        disabled: !connected,
        badge:
          connected && codesState === 'read'
            ? codeTotal > 0
              ? { text: `${codeTotal}`, tone: 'danger' }
              : { text: 'None', tone: 'ok' }
            : null,
      },
      {
        icon: 'camera-timer',
        title: 'Freeze frame',
        hint: 'The sensor snapshot saved the moment a fault was recorded',
        onPress: () => router.push('/freeze-frame'),
        disabled: !connected,
        badge: null,
      },
      {
        icon: 'cog-outline',
        title: 'Settings',
        hint: 'Units, appearance and how the adapter is polled',
        onPress: () => router.push('/settings'),
        disabled: false,
        badge: { text: settings.units.system === 'custom' ? 'Custom' : settings.units.system, tone: 'muted' },
      },
    ],
    [
      codeTotal,
      codesState,
      connected,
      router,
      settings.pinnedPids.length,
      settings.units.system,
      supportedPids.length,
    ],
  );

  const rows = useMemo(() => {
    const out: HubCardProps[][] = [];
    for (let i = 0; i < cards.length; i += 2) out.push(cards.slice(i, i + 2));
    return out;
  }, [cards]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={() => connected && router.push('/vehicle')}
          disabled={!connected}
          accessibilityRole={connected ? 'button' : undefined}
          style={styles.masthead}
        >
          <AppText variant="eyebrow" tone="accent">
            On-board diagnostics
          </AppText>
          <View style={styles.mastheadRow}>
            <AppText variant="title">Your car</AppText>
            {connected ? (
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={theme.color.inkFaint}
                style={styles.mastheadChevron}
              />
            ) : null}
          </View>
          <AppText
            variant="caption"
            tone={connected && codesState === 'read' && reported?.milOn ? 'danger' : 'muted'}
          >
            {!connected
              ? 'Nothing plugged in yet — connect below to begin.'
              : codesState !== 'read'
                ? 'Connected. Tap for vehicle details.'
                : reported?.milOn
                  ? `Check engine light is on · ${reported.count} stored code${reported.count === 1 ? '' : 's'}`
                  : codeTotal > 0
                    ? `${codeTotal} trouble code${codeTotal === 1 ? '' : 's'} read. Tap for vehicle details.`
                    : 'No faults reported. Tap for vehicle details.'}
          </AppText>
        </Pressable>

        <View style={styles.grid}>
          {rows.map((row) => (
            <View key={row.map((card) => card.title).join('-')} style={styles.row}>
              {row.map((card) => (
                <HubCard key={card.title} {...card} />
              ))}
              {row.length === 1 ? <View style={styles.spacer} /> : null}
            </View>
          ))}
        </View>

        <ConnectPanel />
      </ScrollView>
    </Screen>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
    body: {
      gap: t.space.xl,
      paddingTop: t.space.xl,
      paddingBottom: t.space.xl,
    },
    masthead: { gap: t.space.xs },
    mastheadRow: { flexDirection: 'row', alignItems: 'center' },
    mastheadChevron: { marginTop: 2 },
    grid: { gap: t.space.md },
    row: { flexDirection: 'row', gap: t.space.md },
    spacer: { flex: 1 },
  });
