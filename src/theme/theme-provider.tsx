import { ThemeProvider as NavigationThemeProvider, type Theme as NavTheme } from '@react-navigation/native';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { THEMES, type Theme, type ThemeName } from './theme';

export type ThemeMode = 'auto' | 'light' | 'dark';

const ThemeContext = createContext<Theme>(THEMES.light);

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

function navigationTheme(theme: Theme): NavTheme {
  return {
    dark: theme.name === 'dark',
    colors: {
      primary: theme.color.accent,
      background: theme.color.ground,
      card: theme.color.ground,
      text: theme.color.ink,
      border: theme.color.rule,
      notification: theme.color.danger,
    },
    fonts: {
      regular: { fontFamily: theme.font.body, fontWeight: 'normal' },
      medium: { fontFamily: theme.font.bodyMedium, fontWeight: 'normal' },
      bold: { fontFamily: theme.font.bodySemibold, fontWeight: 'normal' },
      heavy: { fontFamily: theme.font.displayBold, fontWeight: 'normal' },
    },
  };
}

export function AppThemeProvider({ mode, children }: { mode: ThemeMode; children: ReactNode }) {
  const system = useColorScheme();
  const name: ThemeName = mode === 'auto' ? (system === 'dark' ? 'dark' : 'light') : mode;
  const theme = THEMES[name];
  const nav = useMemo(() => navigationTheme(theme), [theme]);

  return (
    <ThemeContext.Provider value={theme}>
      <NavigationThemeProvider value={nav}>{children}</NavigationThemeProvider>
    </ThemeContext.Provider>
  );
}
