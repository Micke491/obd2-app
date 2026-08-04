import { useEffect, useRef, useState } from 'react';

import type { Elm327Client } from '@/features/connection/lib/elm327';
import { getPidDefinition } from '@/lib/obd/pids';
import { extractPayload } from '@/lib/obd/protocol';

export type PidSample = {
  value: number;
  /** Set for enumerated PIDs whose number needs a name to mean anything. */
  text: string | null;
  at: number;
};

export type PidStream = {
  samples: Record<string, PidSample>;
  error: string | null;
  /** Completed passes over the requested PIDs. */
  cycles: number;
};

const IDLE_GAP_MS = 40;
const QUERY_TIMEOUT_MS = 2500;

/**
 * Streams a set of PIDs by cycling through them one at a time.
 *
 * The adapter is half-duplex and manages roughly 10–20 queries a second, so
 * values in a set are read sequentially rather than simultaneously; each sample
 * carries its own timestamp instead of implying they share one. Requesting
 * fewer PIDs raises the refresh rate of each.
 */
export function usePidStream(client: Elm327Client | null, pids: string[]): PidStream {
  const [stream, setStream] = useState<PidStream>({ samples: {}, error: null, cycles: 0 });
  const pidsKey = pids.join(',');
  const cyclesRef = useRef(0);

  useEffect(() => {
    if (!client || pids.length === 0) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const order = pidsKey.split(',');

    const run = async () => {
      while (!cancelled) {
        for (const pid of order) {
          if (cancelled) return;

          const definition = getPidDefinition(pid);
          if (!definition) continue;

          try {
            const response = await client.query(`01${pid}`, QUERY_TIMEOUT_MS);
            if (cancelled) return;

            if (!response.ok) {
              // A PID the ECU declines to answer right now is normal; keep the
              // previous value rather than blanking the row.
              continue;
            }

            const payload = extractPayload(response.hex, '41', pid);
            if (!payload || payload.length < definition.bytes) continue;

            const data = payload.slice(0, definition.bytes);
            const value = definition.decode(data);
            if (value === null || Number.isNaN(value)) continue;

            setStream((prev) => ({
              ...prev,
              error: null,
              samples: {
                ...prev.samples,
                [pid]: {
                  value,
                  text: definition.describe ? definition.describe(data) : null,
                  at: Date.now(),
                },
              },
            }));
          } catch (error) {
            if (cancelled) return;
            setStream((prev) => ({
              ...prev,
              error: error instanceof Error ? error.message : 'Read failed',
            }));
          }
        }

        cyclesRef.current += 1;
        setStream((prev) => ({ ...prev, cycles: cyclesRef.current }));

        await new Promise<void>((resolve) => {
          timer = setTimeout(resolve, IDLE_GAP_MS);
        });
      }
    };

    void run();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [client, pidsKey]);

  return stream;
}
