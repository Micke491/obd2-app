import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ObdConnectionProvider } from '@/features/connection/context/obd-connection-provider';
import { TroubleCodesProvider } from '@/features/dtc/context/trouble-codes-provider';
import { SettingsProvider, useSettings } from '@/features/settings/context/settings-provider';
import { AppThemeProvider, FONT_ASSETS, useTheme } from '@/theme';

// Must run before the first render, not inside an effect, or the splash has
// already lifted by the time we ask it to stay.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);
SplashScreen.setOptions({ duration: 240, fade: true });

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        {/* A font failure must not brick the app behind a splash that never lifts. */}
        <AppShell fontsReady={fontsLoaded || fontError !== null} />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

function AppShell({ fontsReady }: { fontsReady: boolean }) {
  const { settings, ready } = useSettings();
  const booted = ready && fontsReady;

  useEffect(() => {
    if (booted) void SplashScreen.hideAsync().catch(() => undefined);
  }, [booted]);

  // Rendering nothing while the splash still covers the window is what keeps
  // the app from showing default units or the wrong palette for a frame.
  if (!booted) return null;

  return (
    <AppThemeProvider mode={settings.themeMode}>
      <ObdConnectionProvider>
        {/* Above the router so the hub and the codes screen share one answer
            to "has this car actually been asked about its faults yet?". */}
        <TroubleCodesProvider>
          <ThemedStatusBar />
          <AppStack />
        </TroubleCodesProvider>
      </ObdConnectionProvider>
    </AppThemeProvider>
  );
}

function ThemedStatusBar() {
  const theme = useTheme();
  return <StatusBar style={theme.name === 'dark' ? 'light' : 'dark'} />;
}

function AppStack() {
  const theme = useTheme();

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
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(live)" options={{ headerShown: false }} />
      <Stack.Screen name="code/[code]" options={{ title: 'Trouble code' }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
    </Stack>
  );
}
