import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

export default function SettingsLayout() {
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
      <Stack.Screen name="units" options={{ title: 'Units' }} />
      <Stack.Screen name="appearance" options={{ title: 'Appearance' }} />
      <Stack.Screen name="adapter" options={{ title: 'Adapter' }} />
      <Stack.Screen name="lookup" options={{ title: 'Look up a code' }} />
      <Stack.Screen name="about" options={{ title: 'About' }} />
    </Stack>
  );
}
