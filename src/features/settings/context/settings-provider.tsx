import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import {
  DEFAULT_SETTINGS,
  flushSettings,
  loadSettings,
  resetSettings,
  saveSettings,
} from '@/lib/storage/settings-store';
import { UNIT_PRESETS, detectSystem, type UnitChoices, type UnitSystem } from '@/lib/units';

import type { Settings } from '../types';

export type SettingsValue = {
  settings: Settings;
  /** False until the stored blob has been read; nothing should render before. */
  ready: boolean;
  update: (patch: Partial<Settings>) => void;
  updateUnits: (patch: Partial<UnitChoices>) => void;
  applyUnitPreset: (system: Exclude<UnitSystem, 'custom'>) => void;
  reset: () => void;
};

const SettingsContext = createContext<SettingsValue | null>(null);

export function useSettings(): SettingsValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside SettingsProvider');
  return value;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void loadSettings().then((loaded) => {
      if (cancelled) return;
      setSettings(loaded);
      readyRef.current = true;
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Every mutation guards on readyRef: writing before the load resolves would
  // persist the defaults over whatever the user had actually chosen.
  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if (readyRef.current) saveSettings(next);
      return next;
    });
  }, []);

  const updateUnits = useCallback((patch: Partial<UnitChoices>) => {
    setSettings((prev) => {
      const choices = { ...prev.units, ...patch };
      // The preset label follows the choices rather than the other way round,
      // so picking mph while everything else stays metric reads as "custom"
      // without any special-casing, and picking the last imperial unit snaps
      // the label back to "imperial" on its own.
      const next: Settings = {
        ...prev,
        units: { ...choices, system: detectSystem(choices) },
      };
      if (readyRef.current) saveSettings(next);
      return next;
    });
  }, []);

  const applyUnitPreset = useCallback((system: Exclude<UnitSystem, 'custom'>) => {
    setSettings((prev) => {
      const next: Settings = { ...prev, units: { system, ...UNIT_PRESETS[system] } };
      if (readyRef.current) saveSettings(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    void resetSettings();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void flushSettings();
    });
    return () => subscription.remove();
  }, []);

  const value = useMemo<SettingsValue>(
    () => ({ settings, ready, update, updateUnits, applyUnitPreset, reset }),
    [settings, ready, update, updateUnits, applyUnitPreset, reset],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
