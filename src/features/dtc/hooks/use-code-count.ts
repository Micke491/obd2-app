import { useCallback, useEffect, useState } from 'react';

import type { Elm327Client } from '@/features/connection/lib/elm327';
import { parseReadiness } from '@/lib/obd/monitors';

export type CodeCount = { count: number; milOn: boolean; known: boolean };

const UNKNOWN: CodeCount = { count: 0, milOn: false, known: false };

/**
 * Just the number for the hub badge.
 *
 * PID 0101 carries the stored-code count and the warning-light state in a
 * single reply, so the hub does not have to run the full three-mode code read
 * that the Trouble codes screen does just to show a number on a card.
 */
export function useCodeCount(client: Elm327Client | null): CodeCount {
  const [state, setState] = useState<CodeCount>(UNKNOWN);

  const read = useCallback(async () => {
    if (!client) {
      setState(UNKNOWN);
      return;
    }
    try {
      const response = await client.query('0101', 4000);
      if (!response.ok) return;
      const readiness = parseReadiness(response.hex);
      if (!readiness) return;
      setState({ count: readiness.dtcCount, milOn: readiness.milOn, known: true });
    } catch {
      // Leave the last known value; a badge is not worth an error state.
    }
  }, [client]);

  useEffect(() => {
    void read();
  }, [read]);

  return state;
}
