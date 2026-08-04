import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ObdConnectionProvider } from '@/features/connection/context/obd-connection-provider';
import { colors, fonts } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ObdConnectionProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: colors.bg },
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.readout,
            headerTitleStyle: { fontFamily: fonts.body, fontSize: 16 },
            headerShadowVisible: false,
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="freeze-frame" options={{ title: 'Freeze frame' }} />
          <Stack.Screen name="monitors" options={{ title: 'Monitors' }} />
        </Stack>
      </ObdConnectionProvider>
    </SafeAreaProvider>
  );
}
