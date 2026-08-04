import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme';

const GLYPHS: Record<string, string> = {
  index: '◉',
  live: '≡',
  codes: '!',
  vehicle: '⬡',
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={styles.icon}>
      <Text style={[styles.glyph, { color: focused ? colors.amber : colors.dim }]}>{GLYPHS[name]}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.bar,
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.dim,
        tabBarLabelStyle: styles.label,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon name="index" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: 'Live data',
          tabBarIcon: ({ focused }) => <TabIcon name="live" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="codes"
        options={{
          title: 'Codes',
          tabBarIcon: ({ focused }) => <TabIcon name="codes" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="vehicle"
        options={{
          title: 'Vehicle',
          tabBarIcon: ({ focused }) => <TabIcon name="vehicle" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.panel,
    borderTopColor: colors.hairline,
    borderTopWidth: 1,
    height: 62,
    paddingTop: 6,
    paddingBottom: 8,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 20,
  },
  glyph: {
    fontSize: 16,
    lineHeight: 20,
  },
});
