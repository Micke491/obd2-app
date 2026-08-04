import type { UnitPreferences } from '@/lib/units';

export type ThemeMode = 'auto' | 'light' | 'dark';

/** Idle gap between poll cycles. Slower settings suit cheap adapter clones. */
export const POLL_RATES = [0, 40, 100, 250, 500] as const;
export type PollRate = (typeof POLL_RATES)[number];

export const POLL_RATE_LABELS: Record<PollRate, string> = {
  0: 'As fast as possible',
  40: 'Fast',
  100: 'Balanced',
  250: 'Relaxed',
  500: 'Gentle',
};

export const TIMEOUTS = [1500, 2500, 4000, 6000] as const;
export type QueryTimeout = (typeof TIMEOUTS)[number];

export type Settings = {
  schema: 1;
  themeMode: ThemeMode;
  units: UnitPreferences;
  pollIntervalMs: PollRate;
  queryTimeoutMs: QueryTimeout;
  keepAwake: boolean;
  autoConnectOnLaunch: boolean;
  /** Remembered so a garage full of paired devices still connects first try. */
  lastAdapterAddress: string | null;
  lastAdapterName: string | null;
  dashboardPids: string[];
  /** The Live data working set. */
  pinnedPids: string[];
  showUnsupportedSensors: boolean;
};
