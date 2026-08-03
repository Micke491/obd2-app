import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import RNBluetoothClassic, { type BluetoothDevice } from 'react-native-bluetooth-classic';

import { Elm327Client, describeError } from '../lib/elm327';
import type { ObdConnectionState } from '../types';

export type ObdConnectionValue = ObdConnectionState & {
  client: Elm327Client | null;
  connect: (device: BluetoothDevice) => Promise<boolean>;
  disconnect: () => Promise<void>;
};

export const ObdConnectionContext = createContext<ObdConnectionValue | null>(null);

const IDLE_STATE: ObdConnectionState = {
  status: 'idle',
  device: null,
  error: null,
  progress: null,
};

/**
 * Owns the adapter session for the whole app.
 *
 * The connection is opened on the connect screen and consumed on the dashboard,
 * which are separate routes — so it cannot live in either screen's state.
 */
export function ObdConnectionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ObdConnectionState>(IDLE_STATE);
  const [client, setClient] = useState<Elm327Client | null>(null);
  /** Mirrors `client` for use in callbacks that must not re-subscribe. */
  const clientRef = useRef<Elm327Client | null>(null);

  const teardown = useCallback(async () => {
    const current = clientRef.current;
    clientRef.current = null;
    setClient(null);
    if (current) await current.disconnect();
  }, []);

  const connect = useCallback(
    async (device: BluetoothDevice): Promise<boolean> => {
      await teardown();
      setState({ status: 'connecting', device, error: null, progress: null });

      let opened: Elm327Client;
      try {
        opened = await Elm327Client.connect(device.address);
      } catch (error) {
        setState({
          status: 'error',
          device: null,
          error: `Could not open a connection to ${device.name}. ${describeError(error)}`,
          progress: null,
        });
        return false;
      }

      clientRef.current = opened;
      setState({ status: 'initializing', device, error: null, progress: 'Starting' });

      try {
        await opened.initialize((progress) => {
          setState((prev) => (prev.status === 'initializing' ? { ...prev, progress } : prev));
        });
      } catch (error) {
        await opened.disconnect();
        clientRef.current = null;
        setState({
          status: 'error',
          device: null,
          error: describeError(error),
          progress: null,
        });
        return false;
      }

      setClient(opened);
      setState({ status: 'connected', device, error: null, progress: null });
      return true;
    },
    [teardown],
  );

  const disconnect = useCallback(async () => {
    await teardown();
    setState(IDLE_STATE);
  }, [teardown]);

  // The adapter can drop on its own — cranking the engine browns out the OBD
  // port on many cars, and cheap adapters reboot. Without this the UI would sit
  // on a stale "connected" while every poll times out.
  useEffect(() => {
    const subscription = RNBluetoothClassic.onDeviceDisconnected(() => {
      if (!clientRef.current) return;
      clientRef.current = null;
      setClient(null);
      setState({
        status: 'error',
        device: null,
        error: 'The adapter disconnected. Check that it is seated firmly in the OBD port.',
        progress: null,
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
