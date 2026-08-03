import { useEffect, useRef, useState } from 'react';

import { describeError } from '@/features/connection/lib/elm327';
import type { Elm327Client } from '@/features/connection/lib/elm327';

import { PID_ENGINE_RPM, parseRpm } from '../lib/pids';
import type { RpmReading } from '../types';

/** Roughly 8 Hz. Faster than an ELM327 can usually answer, so it self-paces. */
const POLL_INTERVAL_MS = 120;
const POLL_TIMEOUT_MS = 3000;

/**
 * Polls engine speed for as long as the client is live.
 *
 * Uses a self-rescheduling timeout rather than setInterval: an interval fires on
 * a fixed schedule regardless of whether the previous request finished, so a
 * slow adapter would accumulate overlapping in-flight commands. That breaks the
 * half-duplex rule the client depends on.
 */
export function useRpm(client: Elm327Client | null): RpmReading {
  const [reading, setReading] = useState<RpmReading>({ rpm: null, error: null, samples: 0 });
  const samplesRef = useRef(0);

  useEffect(() => {
    if (!client) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      if (cancelled) return;

      try {
        const raw = await client.sendCommand(PID_ENGINE_RPM, POLL_TIMEOUT_MS);
        if (cancelled) return;

        const rpm = parseRpm(raw);
        if (rpm !== null) {
          samplesRef.current += 1;
          setReading({ rpm, error: null, samples: samplesRef.current });
        } else {
          // A well-formed "no reading" — normal with the ignition on but the
          // engine not running. Keep the last value rather than blanking it.
          setReading((prev) => ({ ...prev, error: null }));
        }
      } catch (error) {
        if (!cancelled) {
          setReading((prev) => ({ ...prev, error: describeError(error) }));
        }
      }

      if (!cancelled) {
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    void poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [client]);

  return reading;
}
