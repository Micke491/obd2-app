import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import { parseDtcList, type Dtc } from '@/lib/obd/dtc';
import { parseReadiness } from '@/lib/obd/monitors';

export type DtcGroup = 'stored' | 'pending' | 'permanent';

/** Mode 03 stored, 07 pending, 0A permanent — same list format, same parser. */
const GROUP_COMMANDS: Record<DtcGroup, { command: string; responseMode: string; label: string }> = {
  stored: { command: '03', responseMode: '43', label: 'Reading confirmed faults' },
  pending: { command: '07', responseMode: '47', label: 'Reading pending faults' },
  permanent: { command: '0A', responseMode: '4A', label: 'Reading permanent faults' },
};

/** The engine computer's own summary, read straight from PID 0101. */
export type ReportedFaults = { milOn: boolean; count: number };

/**
 * How far through a read the car is.
 *
 * Four steps -- the summary and the three lists -- which is coarse, but it is
 * the true shape of the work rather than an animation invented to look busy.
 * `label` names the step now in flight, so a bar that sits still for six
 * seconds on a slow ECU is still saying something.
 */
export type ReadProgress = { done: number; total: number; label: string };

const READ_STEPS = 4;

/**
 * Reading codes is something you ask for, not something that happens to you.
 *
 * `idle` is the state on arrival and after a reconnect: nothing has been asked
 * of the car, so nothing is claimed about it. `cleared` is its own state rather
 * than a re-read, because the honest thing to show after erasing codes is that
 * the slate is blank — not a fresh all-clear that a still-broken car would
 * disprove the moment you drove it.
 */
export type ReadState = 'idle' | 'read' | 'cleared';

export type TroubleCodesValue = {
  codes: Record<DtcGroup, Dtc[]>;
  state: ReadState;
  /** A read or a clear is in flight. Kept apart from `state` so a re-read
   *  leaves the last results on screen instead of blanking it. */
  busy: boolean;
  error: string | null;
  /** Groups the vehicle declined to answer, as opposed to answering "none". */
  unsupported: DtcGroup[];
  /** Null when the car did not answer the summary request. */
  reported: ReportedFaults | null;
  /** Codes across all three groups, valid only once `state` is `read`. */
  total: number;
  /** Null unless a read is in flight. */
  progress: ReadProgress | null;
  read: () => Promise<void>;
  /** Gives up after the request in flight. What was already read is kept. */
  stop: () => void;
  clear: () => Promise<boolean>;
};

type Snapshot = {
  codes: Record<DtcGroup, Dtc[]>;
  state: ReadState;
  error: string | null;
  unsupported: DtcGroup[];
  reported: ReportedFaults | null;
};

const blank = (state: ReadState): Snapshot => ({
  codes: { stored: [], pending: [], permanent: [] },
  state,
  error: null,
  unsupported: [],
  reported: null,
});

export const TroubleCodesContext = createContext<TroubleCodesValue | null>(null);

export function TroubleCodesProvider({ children }: { children: ReactNode }) {
  const { client } = useObdConnection();
  const [snapshot, setSnapshot] = useState<Snapshot>(() => blank('idle'));
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ReadProgress | null>(null);

  // Flipped by `stop()`, read between requests by the loop in `read()`.
  const stopRef = useRef(false);

  // A new link is a new car as far as this screen knows. Carrying the last
  // car's codes across a reconnect would be worse than showing nothing.
  useEffect(() => {
    setSnapshot(blank('idle'));
    setBusy(false);
    setProgress(null);
    stopRef.current = false;
  }, [client]);

  const read = useCallback(async () => {
    if (!client) return;
    stopRef.current = false;
    setBusy(true);
    setProgress({ done: 0, total: READ_STEPS, label: 'Asking the engine computer' });
    setSnapshot((prev) => ({ ...prev, error: null }));

    const codes: Record<DtcGroup, Dtc[]> = { stored: [], pending: [], permanent: [] };
    const unsupported: DtcGroup[] = [];
    let done = 0;

    try {
      // The car's own tally of stored faults and the state of the warning
      // light. Read alongside the lists so the screen can show what the car
      // says about itself next to what was decoded from it.
      let reported: ReportedFaults | null = null;
      try {
        const summary = await client.query('0101', 4000);
        const readiness = summary.ok ? parseReadiness(summary.hex) : null;
        if (readiness) reported = { milOn: readiness.milOn, count: readiness.dtcCount };
      } catch {
        // A missing summary is not worth failing the scan over.
      }
      done += 1;

      for (const group of Object.keys(GROUP_COMMANDS) as DtcGroup[]) {
        const { command, responseMode, label } = GROUP_COMMANDS[group];

        // Checked between requests rather than during one: a query already in
        // flight has to be let finish, because abandoning it would leave its
        // reply in the adapter's buffer to be mistaken for the answer to
        // whatever is asked next.
        if (stopRef.current) break;
        setProgress({ done, total: READ_STEPS, label });

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
        } finally {
          done += 1;
        }
      }

      // A stopped read still reports what it got. The groups it never reached
      // are absent rather than empty — they are not in `unsupported` either,
      // since the car was never asked and has refused nothing.
      setSnapshot({ codes, state: 'read', error: null, unsupported, reported });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }, [client]);

  const stop = useCallback(() => {
    stopRef.current = true;
  }, []);

  const clear = useCallback(async () => {
    if (!client) return false;
    setBusy(true);
    setSnapshot((prev) => ({ ...prev, error: null }));

    try {
      await client.query('04', 8000);
      // Deliberately not followed by a read. An all-clear the driver never
      // asked for, seconds after erasing the evidence, is the one result this
      // screen should never volunteer.
      setSnapshot(blank('cleared'));
      return true;
    } catch (error) {
      setSnapshot((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Could not clear codes',
      }));
      return false;
    } finally {
      setBusy(false);
    }
  }, [client]);

  const value = useMemo<TroubleCodesValue>(() => {
    const { codes } = snapshot;
    return {
      ...snapshot,
      busy,
      progress,
      total: codes.stored.length + codes.pending.length + codes.permanent.length,
      read,
      stop,
      clear,
    };
  }, [snapshot, busy, progress, read, stop, clear]);

  return <TroubleCodesContext.Provider value={value}>{children}</TroubleCodesContext.Provider>;
}
