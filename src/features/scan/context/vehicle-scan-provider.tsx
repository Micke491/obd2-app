import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import { addressingFor, type CanAddressing } from '@/lib/obd/uds/addressing';
import type { ModuleFault } from '@/lib/obd/uds/faults';
import { parseVin } from '@/lib/obd/vehicle-info';

import { MODULE_MAP_VERSION, foldScanIntoMap, mapAppliesTo, type ModuleMap } from '../lib/module-map';
import { loadModuleMap, saveModuleMap } from '../lib/module-map-store';
import { runScan, type ScanProgress } from '../lib/run-scan';
import { buildScanPlan, type ScanScope } from '../lib/scan-plan';

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

/** The map to fold a scan into: what is already known, or an empty one to start from. */
function baseMap(existing: ModuleMap | null, vin: string | null, protocolId: string | null, now: string): ModuleMap {
  return (
    existing ?? {
      version: MODULE_MAP_VERSION,
      vin: vin ?? '',
      protocolId: protocolId ?? '',
      discoveredAt: now,
      modules: [],
    }
  );
}

/**
 * Folds fresh fault lists into what is already known. Every address this scan
 * actually reached is cleared first, so a module that answered clean this
 * time does not keep showing a fault list from before; an address the scan
 * never reached -- because it stopped early, or only covered some parts --
 * keeps whatever it already had.
 */
function mergeFaults(
  prev: Record<string, ModuleFault[]>,
  asked: string[],
  found: Record<string, ModuleFault[]>,
): Record<string, ModuleFault[]> {
  const next = { ...prev };
  for (const requestId of asked) delete next[requestId];
  return { ...next, ...found };
}

export function VehicleScanProvider({ children }: { children: ReactNode }) {
  const { client } = useObdConnection();

  const [map, setMap] = useState<ModuleMap | null>(null);
  const [faults, setFaults] = useState<Record<string, ModuleFault[]>>({});
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Kept in sync on every render (not via an effect, which would lag a render
  // behind) so an async call that started against an earlier `client` can
  // tell, after an `await`, whether the connection has since moved on.
  const clientRef = useRef(client);
  clientRef.current = client;

  // Synchronous and checked-then-set before any `runScan` call, so two scans
  // -- the connect-time auto-verify and a manual `scan()` -- can never both
  // be mid-sweep at once. `busy` is React state and updates asynchronously;
  // two calls landing in the same tick would both still see it `false`.
  const scanLockRef = useRef(false);
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

    // A manual scan is already running (vanishingly unlikely right after a
    // fresh connection, but the lock is unconditional) -- leave it alone
    // rather than starting a second sweep alongside it.
    if (scanLockRef.current) return;

    let cancelled = false;
    const verifyingClient = client;
    scanLockRef.current = true;

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
        if (cancelled || clientRef.current !== verifyingClient) return;
        vinRef.current = vin;

        const stored = await loadModuleMap(vin);
        if (cancelled || clientRef.current !== verifyingClient || !stored) return;
        if (!mapAppliesTo(stored, vin, client.protocolNumber)) return;

        const plan = buildScanPlan(
          { kind: 'parts', requestIds: stored.modules.map((entry) => entry.requestId) },
          currentAddressing,
        );
        const result = await runScan(verifyingClient, currentAddressing, plan, {
          shouldStop: () => cancelled || stopRef.current,
        });
        if (cancelled || clientRef.current !== verifyingClient) return;

        // `result.visited` -- not the plan, and not "every remembered
        // address" -- because a `stop()` mid-verify or an adapter failure
        // can leave some of them never actually asked this time.
        setMap(foldScanIntoMap(stored, result.visited, result.modules, new Date().toISOString()));
      } catch {
        // A quiet, best-effort flow: it only ever confirms or goes stale what
        // is already known, so a failed VIN read, load or verify is not worth
        // surfacing as an error the driver never asked to see. The map stays
        // whatever it was (null, from the reset above), and an explicit scan
        // is the normal way to recover.
      } finally {
        scanLockRef.current = false;
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [client]);

  const scan = useCallback(
    async (scope: ScanScope) => {
      if (!client || !addressing || scanLockRef.current) return;
      scanLockRef.current = true;

      // Captured now, before any `await`. A whole sweep can run for tens of
      // seconds; reading these fresh afterward would pick up whatever car is
      // connected by the time it finishes, not the one it was asked about.
      const scanningClient = client;
      const vin = vinRef.current;
      const protocolId = client.protocolNumber;

      stopRef.current = false;
      setBusy(true);
      setError(null);

      try {
        const plan = buildScanPlan(scope, addressing);
        setProgress({ done: 0, total: plan.length, found: 0 });

        const result = await runScan(scanningClient, addressing, plan, {
          onProgress: setProgress,
          shouldStop: () => stopRef.current,
        });

        // The connection may have moved on to a different car while this ran.
        // That car's own `[client]` effect has already reset state for it;
        // writing this result on top would attribute the old car's modules
        // to the new car's VIN, or delete the new car's modules outright.
        if (clientRef.current !== scanningClient) return;

        const now = new Date().toISOString();
        const asked = scope.kind === 'whole' ? result.visited : scope.kind === 'parts' ? scope.requestIds : [];

        const folded = foldScanIntoMap(baseMap(map, vin, protocolId, now), asked, result.modules, now);
        const nextMap: ModuleMap = scope.kind === 'whole' ? { ...folded, discoveredAt: now } : folded;

        setMap(nextMap);
        setFaults(mergeFaults(faults, asked, result.faults));

        if (vin) await saveModuleMap(nextMap);

        if (result.adapterFailed) {
          setError('Lost contact with the adapter partway through the scan. Keeping what was found so far.');
        } else if (result.aborted) {
          setError('Scan stopped.');
        }
      } catch (err) {
        if (clientRef.current === scanningClient) {
          setError(err instanceof Error ? err.message : 'Could not complete the scan');
        }
      } finally {
        scanLockRef.current = false;
        if (clientRef.current === scanningClient) setBusy(false);
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
