import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import { addressingFor, type CanAddressing } from '@/lib/obd/uds/addressing';
import type { ModuleFault } from '@/lib/obd/uds/faults';
import { parseVin } from '@/lib/obd/vehicle-info';

import {
  MODULE_MAP_VERSION,
  mapAppliesTo,
  mergeAfterVerify,
  type DiscoveredModule,
  type ModuleMap,
} from '../lib/module-map';
import { loadModuleMap, saveModuleMap } from '../lib/module-map-store';
import { runScan, type ScanProgress } from '../lib/run-scan';
import { buildScanPlan, type ScanScope, type ScanStep } from '../lib/scan-plan';

export type VehicleScanValue = {
  /** Null until a whole-car scan or a restored map has run. */
  map: ModuleMap | null;
  faults: Record<string, ModuleFault[]>;
  addressing: CanAddressing | null;
  busy: boolean;
  progress: ScanProgress | null;
  error: string | null;
  scan: (scope: ScanScope) => Promise<void>;
  stop: () => void;
};

export const VehicleScanContext = createContext<VehicleScanValue | null>(null);

/**
 * Folds a fresh set of found modules into what is already known, replacing
 * only the entries this scan actually touched. Everything else in the map —
 * modules a `parts` scan did not ask about — is left exactly as it was.
 */
function mergeIntoMap(
  existing: ModuleMap | null,
  found: DiscoveredModule[],
  vin: string | null,
  protocolId: string | null,
  now: string,
): ModuleMap {
  const base: ModuleMap = existing ?? {
    version: MODULE_MAP_VERSION,
    vin: vin ?? '',
    protocolId: protocolId ?? '',
    discoveredAt: now,
    modules: [],
  };

  const foundIds = new Set(found.map((entry) => entry.requestId.toUpperCase()));
  const kept = base.modules.filter((entry) => !foundIds.has(entry.requestId.toUpperCase()));

  return { ...base, modules: [...kept, ...found] };
}

/**
 * Folds fresh fault lists into what is already known. Every address the plan
 * actually asked is cleared first, so a module that answered clean this time
 * does not keep showing a fault list from before; addresses outside the plan
 * are untouched.
 */
function mergeFaults(
  prev: Record<string, ModuleFault[]>,
  plan: ScanStep[],
  found: Record<string, ModuleFault[]>,
): Record<string, ModuleFault[]> {
  const next = { ...prev };
  for (const step of plan) delete next[step.requestId];
  return { ...next, ...found };
}

export function VehicleScanProvider({ children }: { children: ReactNode }) {
  const { client } = useObdConnection();

  const [map, setMap] = useState<ModuleMap | null>(null);
  const [faults, setFaults] = useState<Record<string, ModuleFault[]>>({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Flipped by `stop()`, read by every `shouldStop` handed to `runScan`.
  const stopRef = useRef(false);
  // The current car's VIN, read once per connection. Not exposed: it exists
  // only to key the store and to stamp a freshly built map.
  const vinRef = useRef<string | null>(null);

  const addressing = useMemo(() => addressingFor(client?.protocolNumber ?? null), [client]);

  // A new link is a new car as far as this feature knows. Carrying the last
  // car's map across a reconnect would be worse than showing nothing, the
  // same reasoning TroubleCodesProvider uses for its own snapshot.
  useEffect(() => {
    setMap(null);
    setFaults({});
    setBusy(false);
    setProgress(null);
    setError(null);
    stopRef.current = false;
    vinRef.current = null;

    if (!client) return;

    const currentAddressing = addressingFor(client.protocolNumber);
    if (!currentAddressing) return;

    let cancelled = false;

    // Busy for the whole flow, not just the verify scan at the end of it: the
    // VIN read is adapter traffic too, and a manual `scan()` starting while it
    // is in flight would talk over it on the same link.
    setBusy(true);

    (async () => {
      try {
        let vin: string | null = null;
        try {
          const response = await client.query('0902');
          vin = response.ok ? parseVin(response.hex) : null;
        } catch {
          vin = null;
        }
        if (cancelled) return;
        vinRef.current = vin;

        const stored = await loadModuleMap(vin);
        if (cancelled || !stored) return;
        if (!mapAppliesTo(stored, vin, client.protocolNumber)) return;

        const plan = buildScanPlan(
          { kind: 'parts', requestIds: stored.modules.map((entry) => entry.requestId) },
          currentAddressing,
        );
        const result = await runScan(client, currentAddressing, plan, {
          shouldStop: () => cancelled || stopRef.current,
        });
        if (cancelled) return;

        const answered = result.modules.map((entry) => entry.requestId);
        setMap(mergeAfterVerify(stored, answered, new Date().toISOString()));
      } catch {
        // A quiet, best-effort flow: it only ever confirms or goes stale what
        // is already known, so a failed VIN read, load or verify is not worth
        // surfacing as an error the driver never asked to see. The map stays
        // whatever it was (null, from the reset above), and an explicit scan
        // is the normal way to recover.
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [client]);

  const scan = useCallback(
    async (scope: ScanScope) => {
      if (!client || !addressing) return;

      stopRef.current = false;
      setBusy(true);
      setError(null);

      try {
        const plan = buildScanPlan(scope, addressing);
        setProgress({ done: 0, total: plan.length, found: 0 });

        const result = await runScan(client, addressing, plan, {
          onProgress: setProgress,
          shouldStop: () => stopRef.current,
        });

        const now = new Date().toISOString();
        const vin = vinRef.current;
        const protocolId = client.protocolNumber;

        const nextMap: ModuleMap =
          scope.kind === 'whole'
            ? {
                version: MODULE_MAP_VERSION,
                vin: vin ?? '',
                protocolId: protocolId ?? '',
                discoveredAt: now,
                modules: result.modules,
              }
            : mergeIntoMap(map, result.modules, vin, protocolId, now);

        setMap(nextMap);
        setFaults(scope.kind === 'whole' ? result.faults : mergeFaults(faults, plan, result.faults));

        if (vin) await saveModuleMap(nextMap);

        if (result.adapterFailed) {
          setError('Lost contact with the adapter partway through the scan. Keeping what was found so far.');
        } else if (result.aborted) {
          setError('Scan stopped.');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not complete the scan');
      } finally {
        setBusy(false);
      }
    },
    [client, addressing, map, faults],
  );

  const stop = useCallback(() => {
    stopRef.current = true;
  }, []);

  const value = useMemo<VehicleScanValue>(
    () => ({ map, faults, addressing, busy, progress, error, scan, stop }),
    [map, faults, addressing, busy, progress, error, scan, stop],
  );

  return <VehicleScanContext.Provider value={value}>{children}</VehicleScanContext.Provider>;
}
