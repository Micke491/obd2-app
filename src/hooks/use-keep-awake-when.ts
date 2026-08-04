import { useEffect } from 'react';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

const TAG = 'ob2-live';

/**
 * expo-keep-awake's own hook has no way to be switched off, and hooks cannot be
 * called conditionally, so the setting is applied inside the effect instead.
 */
export function useKeepAwakeWhen(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    void activateKeepAwakeAsync(TAG).catch(() => undefined);
    return () => {
      void deactivateKeepAwake(TAG).catch(() => undefined);
    };
  }, [enabled]);
}
