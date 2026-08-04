import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space, useTheme } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  /** Disable horizontal padding when a child needs to bleed to the edges. */
  flush?: boolean;
  /** Screens under a stack header already clear the status bar. */
  edges?: { top?: boolean; bottom?: boolean };
};

/** Page shell: applies the ground colour and keeps content clear of system bars. */
export function Screen({ children, flush = false, edges }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const top = edges?.top === false ? 0 : insets.top;
  const bottom = edges?.bottom === false ? 0 : insets.bottom;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.color.ground,
          paddingTop: top,
          paddingBottom: bottom,
          paddingLeft: flush ? 0 : space.lg,
          paddingRight: flush ? 0 : space.lg,
        },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
