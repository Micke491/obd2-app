import AsyncStorage from '@react-native-async-storage/async-storage';

import { MODULE_MAP_VERSION, type ModuleMap } from './module-map';

const key = (vin: string) => `scan.module-map.v${MODULE_MAP_VERSION}.${vin}`;

/** A car with no readable VIN gets no persistence, rather than a shared slot. */
export async function loadModuleMap(vin: string | null): Promise<ModuleMap | null> {
  if (!vin) return null;

  try {
    const raw = await AsyncStorage.getItem(key(vin));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as ModuleMap;
    // A map written by an older shape is discarded rather than migrated: it
    // costs one forty-second sweep to rebuild and nothing to get wrong.
    if (parsed.version !== MODULE_MAP_VERSION || parsed.vin !== vin) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveModuleMap(map: ModuleMap): Promise<void> {
  try {
    await AsyncStorage.setItem(key(map.vin), JSON.stringify(map));
  } catch {
    // Losing the map costs one sweep. It is not worth failing a scan over.
  }
}
