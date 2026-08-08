import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { PidSample } from '@/hooks/use-pid-stream';

import { appendPoint, type TracePoint } from '../lib/trace-buffer';

/** Repaint cadence, matching the spirit of FLUSH_MS in usePidStream. */
const TRACE_PAINT_MS = 250;

export type PidTrace = {
  /** Hand this to usePidStream as `onSample`. */
  record: (pid: string, sample: PidSample) => void;
  traces: Record<string, TracePoint[]>;
  /** Changes whenever the buffers have. Use it as a memo dependency. */
  revision: number;
  /** Epoch ms of the newest sample recorded, or null before the first. */
  latestAt: number | null;
  clear: () => void;
};

/**
 * Keeps a rolling history of the PIDs it is given.
 *
 * Samples arrive from the poll loop at whatever rate the adapter manages and
 * are written straight into refs, because a setState per sample would repaint
 * the chart twenty times a second to no visible benefit. A timer bumps a
 * revision counter instead, so the graph redraws on a fixed cadence.
 *
 * The timer keeps ticking when no samples arrive, and that is deliberate: the
 * window is anchored to the clock rather than to the last reading, so a car
 * that stops answering shows a line that stops rather than a chart that quietly
 * freezes and still looks live.
 */
export function usePidTrace(pids: string[]): PidTrace {
  const tracesRef = useRef<Record<string, TracePoint[]>>({});
  const latestAtRef = useRef<number | null>(null);
  const [revision, setRevision] = useState(0);

  const pidsKey = pids.join(',');
  const wantedRef = useRef<Set<string>>(new Set(pids));

  // Dropping a PID from the set drops its history with it, so switching groups
  // cannot leave buffers filling for lines nobody is looking at.
  useEffect(() => {
    const wanted = new Set(pidsKey ? pidsKey.split(',') : []);
    wantedRef.current = wanted;

    for (const pid of Object.keys(tracesRef.current)) {
      if (!wanted.has(pid)) delete tracesRef.current[pid];
    }
  }, [pidsKey]);

  const record = useCallback((pid: string, sample: PidSample) => {
    if (!wantedRef.current.has(pid)) return;

    const points = tracesRef.current[pid] ?? (tracesRef.current[pid] = []);
    appendPoint(points, { at: sample.at, value: sample.value });
    latestAtRef.current = sample.at;
  }, []);

  const clear = useCallback(() => {
    tracesRef.current = {};
    latestAtRef.current = null;
    setRevision((previous) => previous + 1);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      // Nothing recorded yet means nothing to draw, so stay quiet until the
      // first sample rather than re-rendering an empty screen four times a
      // second while the ignition is off.
      if (latestAtRef.current === null) return;
      setRevision((previous) => previous + 1);
    }, TRACE_PAINT_MS);

    return () => clearInterval(timer);
  }, []);

  return useMemo(
    () => ({
      record,
      clear,
      revision,
      traces: tracesRef.current,
      latestAt: latestAtRef.current,
    }),
    [record, clear, revision],
  );
}
