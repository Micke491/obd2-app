import AsyncStorage from '@react-native-async-storage/async-storage';

import { isPlausibleVin } from '@/lib/obd/vehicle-info';

import { MODULE_MAP_VERSION, type ModuleMap } from './module-map';

const key = (vin: string) => `scan.module-map.v${MODULE_MAP_VERSION}.${vin}`;

/**
 * A car with no readable VIN gets no persistence, rather than a shared slot.
 *
 * `parseVin` deliberately falls back to the raw decoded text when it fails
 * `isPlausibleVin` -- right for a display field, wrong here: a garbled Mode
 * 09 read must not become a storage key, or two cars that garble the same
 * way share each other's modules. Checked here, not trusted to every caller,
 * so the store is correct regardless of what it is handed.
 */
export async function loadModuleMap(vin: string | null): Promise<ModuleMap | null> {
  if (!vin || !isPlausibleVin(vin)) return null;

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
  if (!isPlausibleVin(map.vin)) return;

  try {
    await AsyncStorage.setItem(key(map.vin), JSON.stringify(map));
  } catch {
    // Losing the map costs one sweep. It is not worth failing a scan over.
  }
}
