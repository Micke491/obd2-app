import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

import { Elm327Client, describeError } from '../lib/elm327';
import { NoAdapterError, findAdapterCandidates, looksLikeObdAdapter } from '../lib/find-adapter';
import { requestBluetoothPermissions } from '../lib/permissions';
import type { ObdConnectionState } from '../types';

export type ObdConnectionValue = ObdConnectionState & {
  client: Elm327Client | null;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
};

export const ObdConnectionContext = createContext<ObdConnectionValue | null>(null);

/**
 * Failed repairs before the link is called lost. One failure is common — the
 * adapter is often still rebooting when the first attempt runs — so a second is
 * what distinguishes a slow recovery from a dead one.
 */
const RECOVERY_ATTEMPTS = 2;

const IDLE_STATE: ObdConnectionState = {
  status: 'idle',
  adapter: 'idle',
  ecu: 'idle',
  device: null,
  error: null,
  progress: null,
  protocol: null,
  log: [],
  supportedPids: [],
};

export function ObdConnectionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ObdConnectionState>(IDLE_STATE);
  const [client, setClient] = useState<Elm327Client | null>(null);
  const clientRef = useRef<Elm327Client | null>(null);
  const repairRef = useRef<Promise<void> | null>(null);

  const teardown = useCallback(async () => {
    const current = clientRef.current;
    clientRef.current = null;
    repairRef.current = null;
    setClient(null);
    if (current) {
      current.onTrouble(null);
      await current.disconnect();
    }
  }, []);

  /**
   * Puts a link that has stopped answering back together without involving the
   * driver. A clone adapter resets when the engine cranks and comes back with
   * its configuration lost; nothing about that heals on its own, and the old
   * behaviour was a dashboard that kept showing the last numbers it had read as
   * though they were current. Silent while it works, because the point is that
   * the readings keep coming.
   */
  const repairLink = useCallback((broken: Elm327Client) => {
    if (repairRef.current) return;

    const run = (async () => {
      for (let attempt = 1; attempt <= RECOVERY_ATTEMPTS; attempt += 1) {
        if (clientRef.current !== broken) return;

        try {
          await broken.recover();
          console.log('[OBD] link repaired');
          return;
        } catch (error) {
          console.log(`[OBD] repair attempt ${attempt} failed:`, describeError(error));
        }
      }

      if (clientRef.current !== broken) return;

      clientRef.current = null;
      setClient(null);
      setState({
        ...IDLE_STATE,
        status: 'error',
        log: broken.connectionTrace,
        error:
          'Lost contact with the adapter. Check it is seated firmly in the OBD port, then connect again.',
      });
      void broken.disconnect();
    })();

    repairRef.current = run;
    void run.finally(() => {
      if (repairRef.current === run) repairRef.current = null;
    });
  }, []);

  const connect = useCallback(async (): Promise<boolean> => {
    await teardown();
    setState({ ...IDLE_STATE, status: 'connecting', adapter: 'pending', progress: 'Checking permissions' });

    const granted = await requestBluetoothPermissions();
    if (!granted) {
      setState({
        ...IDLE_STATE,
        status: 'error',
        adapter: 'failed',
        error: 'Bluetooth permission denied. Grant it in Settings to reach the adapter.',
      });
      return false;
    }

    let opened: Elm327Client;
    // Held separately so the report survives a failure that leaves `opened`
    // unassigned — the attempt that never got as far as a client is exactly the
    // one worth being able to read afterwards.
    let started: Elm327Client | null = null;

    try {
      setState((prev) => ({ ...prev, progress: 'Looking for adapter' }));
      const candidates = await findAdapterCandidates();

      // Each candidate in turn, until one both opens a socket and answers a
      // command. Nothing is remembered from last time, so a first connection and
      // a hundredth take the same path — and an adapter that is merely paired,
      // rather than plugged in, costs one failed dial instead of the whole
      // attempt.
      let ready: Elm327Client | null = null;
      let failure: unknown = null;

      for (const device of candidates) {
        setState((prev) => ({ ...prev, device, progress: `Connecting to ${device.name}` }));

        let attempt: Elm327Client | null = null;
        try {
          attempt = await Elm327Client.connect(device.address, looksLikeObdAdapter(device) ? undefined : 1);
          started = attempt;
          clientRef.current = attempt;
          await attempt.initializeAdapter((progress) => {
            setState((prev) => ({ ...prev, progress }));
          });
          ready = attempt;
          break;
        } catch (error) {
          failure = error;
          clientRef.current = null;
          if (attempt) void attempt.disconnect();
        }
      }

      if (!ready) throw failure ?? new NoAdapterError('No adapter answered.');
      opened = ready;
    } catch (error) {
      await teardown();
      setState({
        ...IDLE_STATE,
        status: 'error',
        adapter: 'failed',
        log: started?.connectionTrace ?? [],
        error:
          error instanceof NoAdapterError
            ? error.message
            : `Could not reach the adapter. ${describeError(error)}`,
      });
      return false;
    }

    setState((prev) => ({ ...prev, adapter: 'ready', ecu: 'pending', progress: 'Contacting ECU' }));

    try {
      await opened.connectEcu((progress) => {
        setState((prev) => ({ ...prev, progress }));
      });
    } catch (error) {
      // The adapter is fine here, so it stays marked ready — only the vehicle
      // link failed, and that distinction is what tells you where to look.
      setState((prev) => ({
        ...prev,
        status: 'error',
        ecu: 'failed',
        progress: null,
        error: describeError(error),
        log: opened.connectionTrace,
      }));
      return false;
    }

    setState((prev) => ({ ...prev, ecu: 'ready', progress: 'Reading supported sensors' }));

    const supportedPids = await opened.discoverSupportedPids();

    opened.onTrouble(() => repairLink(opened));

    setClient(opened);
    setState((prev) => ({
      ...prev,
      status: 'connected',
      progress: null,
      protocol: opened.protocol,
      log: opened.connectionTrace,
      supportedPids,
    }));
    return true;
  }, [teardown, repairLink]);

  const disconnect = useCallback(async () => {
    await teardown();
    setState(IDLE_STATE);
  }, [teardown]);

  // Cranking browns out the OBD port on many cars and cheap adapters reboot,
  // so a drop must be surfaced rather than left as a stale "connected".
  useEffect(() => {
    const subscription = RNBluetoothClassic.onDeviceDisconnected(() => {
      if (!clientRef.current) return;
      clientRef.current = null;
      setClient(null);
      setState({
        ...IDLE_STATE,
        status: 'error',
        error: 'The adapter disconnected. Check it is seated firmly in the OBD port.',
      });
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    return () => {
      void clientRef.current?.disconnect();
      clientRef.current = null;
    };
  }, []);

  const value = useMemo<ObdConnectionValue>(
    () => ({ ...state, client, connect, disconnect }),
    [state, client, connect, disconnect],
  );

  return <ObdConnectionContext.Provider value={value}>{children}</ObdConnectionContext.Provider>;
}
