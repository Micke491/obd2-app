import { useCallback, useEffect, useState } from 'react';

import type { Elm327Client } from '@/features/connection/lib/elm327';
import { parseDtcList, type Dtc } from '@/lib/obd/dtc';
import { parseReadiness } from '@/lib/obd/monitors';

export type DtcGroup = 'stored' | 'pending' | 'permanent';

/** Mode 03 stored, 07 pending, 0A permanent — same list format, same parser. */
const GROUP_COMMANDS: Record<DtcGroup, { command: string; responseMode: string }> = {
  stored: { command: '03', responseMode: '43' },
  pending: { command: '07', responseMode: '47' },
  permanent: { command: '0A', responseMode: '4A' },
};

/** The engine computer's own summary, read straight from PID 0101. */
export type ReportedFaults = { milOn: boolean; count: number };

export type TroubleCodesState = {
  codes: Record<DtcGroup, Dtc[]>;
  loading: boolean;
  error: string | null;
  /** Groups the vehicle declined to answer, as opposed to answering "none". */
  unsupported: DtcGroup[];
  /** Null when the car did not answer the summary request. */
  reported: ReportedFaults | null;
};

const EMPTY: TroubleCodesState = {
  codes: { stored: [], pending: [], permanent: [] },
  loading: false,
  error: null,
  unsupported: [],
  reported: null,
};

export function useTroubleCodes(client: Elm327Client | null) {
  const [state, setState] = useState<TroubleCodesState>(EMPTY);

  const refresh = useCallback(async () => {
    if (!client) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const codes: Record<DtcGroup, Dtc[]> = { stored: [], pending: [], permanent: [] };
    const unsupported: DtcGroup[] = [];

    // The car's own tally of stored faults and the state of the warning light.
    // Read alongside the lists so the screen can show what the car says about
    // itself next to what was decoded from it.
    let reported: ReportedFaults | null = null;
    try {
      const summary = await client.query('0101', 4000);
      const readiness = summary.ok ? parseReadiness(summary.hex) : null;
      if (readiness) reported = { milOn: readiness.milOn, count: readiness.dtcCount };
    } catch {
      // A missing summary is not worth failing the scan over.
    }

    for (const group of Object.keys(GROUP_COMMANDS) as DtcGroup[]) {
      const { command, responseMode } = GROUP_COMMANDS[group];
      try {
        const response = await client.query(command, 6000);
        if (!response.ok) {
          // "No data" here means no codes in that group, which is the normal
          // answer on a healthy car — only a refusal counts as unsupported.
          if (!/no data/i.test(response.reason)) unsupported.push(group);
          continue;
        }
        // Per frame, so two control units each reporting nothing stay two
        // answers of nothing instead of merging into an invented fault.
        codes[group] = parseDtcList(response.frames, responseMode);
      } catch {
        unsupported.push(group);
      }
    }

    setState({ codes, loading: false, error: null, unsupported, reported });
  }, [client]);

  const clearCodes = useCallback(async () => {
    if (!client) return false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      await client.query('04', 8000);
      await refresh();
      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Could not clear codes',
      }));
      return false;
    }
  }, [client, refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh, clearCodes };
}
