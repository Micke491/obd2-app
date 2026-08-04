import type { ViewStyle } from 'react-native';

import { PALETTES, type Palette, type ThemeName } from './palette';
import { fonts, type Fonts } from './typography';
import { TOUCH_TARGET, hairline, radius, space } from './tokens';

export type Theme = {
  name: ThemeName;
  color: Palette;
  font: Fonts;
  space: typeof space;
  radius: typeof radius;
  size: { touch: number; hairline: number };
  /** Real elevation on paper; dark mode leans on rules instead. */
  shadow: { card: ViewStyle; raised: ViewStyle };
};

const LIGHT_SHADOW: Theme['shadow'] = {
  card: {
    shadowColor: '#1A2418',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  raised: {
    shadowColor: '#1A2418',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
};

const DARK_SHADOW: Theme['shadow'] = { card: {}, raised: {} };

function build(name: ThemeName): Theme {
  return {
    name,
    color: PALETTES[name],
    font: fonts,
    space,
    radius,
    size: { touch: TOUCH_TARGET, hairline },
    shadow: name === 'light' ? LIGHT_SHADOW : DARK_SHADOW,
  };
}

export const THEMES: Record<ThemeName, Theme> = {
  light: build('light'),
  dark: build('dark'),
};

export type { ThemeName, Palette };
