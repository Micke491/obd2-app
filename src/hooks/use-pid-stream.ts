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

export type PidStreamOptions = {
  idleGapMs?: number;
  queryTimeoutMs?: number;
  /** Pause without unmounting, e.g. while the screen is not focused. */
  enabled?: boolean;
};

const DEFAULT_IDLE_GAP_MS = 40;
const DEFAULT_QUERY_TIMEOUT_MS = 2500;
/** Samples land in a buffer and paint on this cadence, not one render each. */
const FLUSH_MS = 200;

const EMPTY: PidStream = { samples: {}, error: null, cycles: 0 };

/**
 * Streams a set of PIDs by cycling through them one at a time.
 *
 * The adapter is half-duplex and manages roughly 10–20 queries a second, so
 * values in a set are read sequentially rather than simultaneously; each sample
 * carries its own timestamp instead of implying they share one. Requesting
 * fewer PIDs raises the refresh rate of each.
 *
 * The requested set is read from a ref at the top of every cycle rather than
 * being an effect dependency. A screen that changes its set as you scroll would
 * otherwise tear down and restart the loop mid-query on every scroll frame.
 */
export function usePidStream(
  client: Elm327Client | null,
  pids: string[],
  options: PidStreamOptions = {},
): PidStream {
  const { idleGapMs = DEFAULT_IDLE_GAP_MS, queryTimeoutMs = DEFAULT_QUERY_TIMEOUT_MS, enabled = true } = options;

  const [stream, setStream] = useState<PidStream>(EMPTY);
  const pidsKey = pids.join(',');
  const orderRef = useRef<string[]>(pids);
  const optionsRef = useRef({ idleGapMs, queryTimeoutMs });

  useEffect(() => {
    orderRef.current = pidsKey ? pidsKey.split(',') : [];
  }, [pidsKey]);

  useEffect(() => {
    optionsRef.current = { idleGapMs, queryTimeoutMs };
  }, [idleGapMs, queryTimeoutMs]);

  useEffect(() => {
    if (!client || !enabled) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cycles = 0;

    // Buffered so a sixty-row list repaints five times a second rather than
    // once per query. Values still carry their own read timestamp.
    const buffer: Record<string, PidSample> = {};
    let bufferedError: string | null = null;
    let dirty = false;

    const flushTimer = setInterval(() => {
      if (!dirty || cancelled) return;
      dirty = false;
      const batch = { ...buffer };
      const error = bufferedError;
      setStream((prev) => ({
        samples: { ...prev.samples, ...batch },
        error,
        cycles,
      }));
    }, FLUSH_MS);

    const run = async () => {
      while (!cancelled) {
        const order = orderRef.current;

        if (order.length === 0) {
          await new Promise<void>((resolve) => {
            timer = setTimeout(resolve, FLUSH_MS);
          });
          continue;
        }

        for (const pid of order) {
          if (cancelled) return;

          const definition = getPidDefinition(pid);
          if (!definition) continue;

          try {
            const response = await client.query(`01${pid}`, optionsRef.current.queryTimeoutMs);
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

            buffer[pid] = {
              value,
              text: definition.describe ? definition.describe(data) : null,
              at: Date.now(),
            };
            bufferedError = null;
            dirty = true;
          } catch (error) {
            if (cancelled) return;
            bufferedError = error instanceof Error ? error.message : 'Read failed';
            dirty = true;
          }
        }

        cycles += 1;
        dirty = true;

        await new Promise<void>((resolve) => {
          timer = setTimeout(resolve, optionsRef.current.idleGapMs);
        });
      }
    };

    void run();

    return () => {
      cancelled = true;
      clearInterval(flushTimer);
      if (timer) clearTimeout(timer);
    };
  }, [client, enabled]);

  return stream;
}
