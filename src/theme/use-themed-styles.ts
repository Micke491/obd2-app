import { useMemo } from 'react';
import type { StyleSheet as RNStyleSheet } from 'react-native';

import { useTheme } from './theme-provider';
import type { Theme, ThemeName } from './theme';

type NamedStyles<T> = RNStyleSheet.NamedStyles<T>;
type Factory<T> = (theme: Theme) => T;

/**
 * Registered stylesheets are cached per factory per theme, so switching themes
 * costs one `StyleSheet.create` per screen and switching back costs nothing.
 * Keyed weakly on the factory function, which lives at module scope.
 */
const cache = new WeakMap<Factory<never>, Partial<Record<ThemeName, unknown>>>();

export function useThemedStyles<T extends NamedStyles<T> | NamedStyles<unknown>>(
  factory: Factory<T>,
): T {
  const theme = useTheme();

  return useMemo(() => {
    const key = factory as unknown as Factory<never>;
    let byTheme = cache.get(key);
    if (!byTheme) {
      byTheme = {};
      cache.set(key, byTheme);
    }

    const hit = byTheme[theme.name] as T | undefined;
    if (hit) return hit;

    const created = factory(theme);
    byTheme[theme.name] = created;
    return created;
  }, [factory, theme]);
}
