import { Platform } from 'react-native';

/**
 * Instrument-cluster palette. Dark is functional here, not stylistic: the app is
 * read inside a car, often at night, and a bright screen is both blinding and a
 * battery drain on OLED panels.
 */
export const colors = {
  /** Page ground. Near-black, cooled slightly so it doesn't read as dead grey. */
  bg: '#07090B',
  /** Raised surfaces: list rows, footers. */
  panel: '#10151A',
  /** Pressed/active surface. */
  panelActive: '#171E26',
  /** Hairline borders. */
  hairline: '#1E262E',
  /** Secondary text, labels, units. */
  dim: '#6B7885',
  /** Primary text and the readout at idle. */
  readout: '#F2F5F7',
  /** Mid-range revs. Lifted from amber instrument lighting. */
  amber: '#FFA31A',
  /** Redline. Reserved exclusively for over-limit engine speed and errors. */
  redline: '#FF3B30',
  /** Connection-alive indicator only. */
  live: '#34D399',
} as const;

/**
 * Condensed grotesque for the readout is the tachometer idiom, and monospace is
 * the diagnostic-tool idiom. Both ship with Android, so the APK carries no font
 * assets.
 */
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

/** Minimum touch target. Relevant when tapping in a moving vehicle. */
export const TOUCH_TARGET = 48;
