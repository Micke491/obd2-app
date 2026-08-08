import { Redirect, Stack } from 'expo-router';

import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import { useTheme } from '@/theme';

/**
 * The single connection guard.
 *
 * Every screen in this group needs a live adapter, so the check lives here
 * instead of being repeated in each route file. Bouncing back to the hub lands
 * you on the connect panel rather than a dead end.
 */
export default function LiveLayout() {
  const { client } = useObdConnection();
  const theme = useTheme();

  if (!client) return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: theme.color.ground },
        headerStyle: { backgroundColor: theme.color.ground },
        headerTintColor: theme.color.ink,
        headerTitleStyle: { fontFamily: theme.font.bodySemibold, fontSize: 17 },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="live" options={{ headerShown: false }} />
      <Stack.Screen name="sensors" options={{ headerShown: false }} />
      <Stack.Screen name="codes" options={{ headerShown: false }} />
      <Stack.Screen name="freeze-frame" options={{ title: 'Freeze frame' }} />
      <Stack.Screen name="monitors" options={{ title: 'Readiness monitors' }} />
      <Stack.Screen name="vehicle" options={{ title: 'Vehicle details' }} />
    </Stack>
  );
}
