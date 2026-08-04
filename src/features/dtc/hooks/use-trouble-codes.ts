import { useCallback, useEffect, useState } from 'react';

import type { Elm327Client } from '@/features/connection/lib/elm327';
import { parseDtcList, type Dtc } from '@/lib/obd/dtc';

export type DtcGroup = 'stored' | 'pending' | 'permanent';

/** Mode 03 stored, 07 pending, 0A permanent — same list format, same parser. */
const GROUP_COMMANDS: Record<DtcGroup, { command: string; responseMode: string }> = {
  stored: { command: '03', responseMode: '43' },
  pending: { command: '07', responseMode: '47' },
  permanent: { command: '0A', responseMode: '4A' },
};

export type TroubleCodesState = {
  codes: Record<DtcGroup, Dtc[]>;
  loading: boolean;
  error: string | null;
  /** Groups the vehicle declined to answer, as opposed to answering "none". */
  unsupported: DtcGroup[];
};

const EMPTY: TroubleCodesState = {
  codes: { stored: [], pending: [], permanent: [] },
  loading: false,
  error: null,
  unsupported: [],
};

export function useTroubleCodes(client: Elm327Client | null) {
  const [state, setState] = useState<TroubleCodesState>(EMPTY);

  const refresh = useCallback(async () => {
    if (!client) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const codes: Record<DtcGroup, Dtc[]> = { stored: [], pending: [], permanent: [] };
    const unsupported: DtcGroup[] = [];

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
        codes[group] = parseDtcList(response.hex, responseMode);
      } catch {
        unsupported.push(group);
      }
    }

    setState({ codes, loading: false, error: null, unsupported });
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
