import { Platform } from 'react-native';

export const colors = {
  bg: '#07090B',
  panel: '#10151A',
  panelActive: '#171E26',
  hairline: '#1E262E',
  dim: '#6B7885',
  readout: '#F2F5F7',
  /** Mid-range revs, active tab, accents. */
  amber: '#FFA31A',
  /** Over-limit engine speed and errors only. */
  redline: '#FF3B30',
  /** Connection-alive indicator only. */
  live: '#34D399',
} as const;

/** All three ship with Android, so the APK carries no font assets. */
export const fonts = {
  display: Platform.select({ android: 'sans-serif-condensed', default: 'System' })!,
  body: Platform.select({ android: 'sans-serif', default: 'System' })!,
  mono: Platform.select({ android: 'monospace', ios: 'Menlo', default: 'monospace' })!,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
} as const;

export const TOUCH_TARGET = 48;
