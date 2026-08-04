import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_UNITS } from '@/lib/units';
import type { Settings } from '@/features/settings/types';

const KEY = 'ob2.settings.v1';
const WRITE_DEBOUNCE_MS = 250;

export const DEFAULT_DASHBOARD_PIDS = ['0D', '05', '04', '11', '0F', '42'];
export const DEFAULT_PINNED_PIDS = ['0C', '0D', '05', '11', '04', '10'];

export const DEFAULT_SETTINGS: Settings = {
  schema: 1,
  themeMode: 'auto',
  units: DEFAULT_UNITS,
  pollIntervalMs: 40,
  queryTimeoutMs: 2500,
  keepAwake: true,
  autoConnectOnLaunch: false,
  lastAdapterAddress: null,
  lastAdapterName: null,
  dashboardPids: DEFAULT_DASHBOARD_PIDS,
  pinnedPids: DEFAULT_PINNED_PIDS,
  showUnsupportedSensors: false,
};

/**
 * Merges over the defaults one level deep, so a release that adds a field finds
 * it already populated instead of needing a migration. `schema` is held back
 * for changes that genuinely cannot be merged.
 */
function hydrate(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      units: { ...DEFAULT_SETTINGS.units, ...(parsed.units ?? {}) },
    };
  } catch {
    // A corrupt blob is not worth surfacing — defaults are a working app.
    return DEFAULT_SETTINGS;
  }
}

export async function loadSettings(): Promise<Settings> {
  try {
    return hydrate(await AsyncStorage.getItem(KEY));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;
let queued: Settings | null = null;

async function flush(): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const pending = queued;
  queued = null;
  if (!pending) return;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(pending));
  } catch {
    // Losing a preference write is survivable; crashing over it is not.
  }
}

/** Debounced so dragging a slider does not write once per frame. */
export function saveSettings(settings: Settings): void {
  queued = settings;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flush(), WRITE_DEBOUNCE_MS);
}

/** Call when the app backgrounds, so a pending write is not lost on kill. */
export function flushSettings(): Promise<void> {
  return flush();
}

export async function resetSettings(): Promise<void> {
  queued = null;
  if (timer) clearTimeout(timer);
  timer = null;
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Nothing useful to do; the in-memory reset already happened.
  }
}
