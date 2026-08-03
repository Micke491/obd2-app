import { useCallback, useEffect, useState } from 'react';
import RNBluetoothClassic, { type BluetoothDevice } from 'react-native-bluetooth-classic';

import { describeError } from '../lib/elm327';
import { requestBluetoothPermissions } from '../lib/permissions';

/**
 * Name fragments common to ELM327 adapters and their clones.
 *
 * Used only to sort matches to the top, never to filter: adapter names are not
 * standardised, and hiding an unrecognised one would make the app look broken
 * for exactly the person whose hardware is unusual.
 */
const OBD_NAME_HINTS = ['OBD', 'ELM', 'VLINK', 'V-LINK', 'VGATE', 'VIECAR', 'KONNWEI', 'SCAN'];

export function looksLikeObdAdapter(device: BluetoothDevice): boolean {
  const name = (device.name ?? '').toUpperCase().replace(/\s/g, '');
  return OBD_NAME_HINTS.some((hint) => name.includes(hint.replace(/\s|-/g, '')));
}

type BondedDevicesState = {
  devices: BluetoothDevice[];
  loading: boolean;
  error: string | null;
  /** True when Bluetooth is off, which is worth a different message than a failure. */
  bluetoothOff: boolean;
};

/**
 * Loads paired devices, handling the full precondition chain: runtime
 * permissions, then adapter power, then the device list itself. Each failure
 * mode gets its own message because the fix for each is different.
 */
export function useBondedDevices() {
  const [state, setState] = useState<BondedDevicesState>({
    devices: [],
    loading: true,
    error: null,
    bluetoothOff: false,
  });

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const granted = await requestBluetoothPermissions();
    if (!granted) {
      setState({
        devices: [],
        loading: false,
        bluetoothOff: false,
        error: 'Bluetooth permission was denied. Grant it in Settings to see your adapter.',
      });
      return;
    }

    try {
      const enabled = await RNBluetoothClassic.isBluetoothEnabled();
      if (!enabled) {
        setState({ devices: [], loading: false, bluetoothOff: true, error: null });
        return;
      }

      const bonded = await RNBluetoothClassic.getBondedDevices();
      const sorted = [...bonded].sort((a, b) => {
        const aIsObd = looksLikeObdAdapter(a);
        const bIsObd = looksLikeObdAdapter(b);
        if (aIsObd !== bIsObd) return aIsObd ? -1 : 1;
        return (a.name ?? '').localeCompare(b.name ?? '');
      });

      setState({ devices: sorted, loading: false, error: null, bluetoothOff: false });
    } catch (error) {
      setState({ devices: [], loading: false, bluetoothOff: false, error: describeError(error) });
    }
  }, []);

  const enableBluetooth = useCallback(async () => {
    try {
      await RNBluetoothClassic.requestBluetoothEnabled();
      await refresh();
    } catch (error) {
      setState((prev) => ({ ...prev, error: describeError(error) }));
    }
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ...state, refresh, enableBluetooth };
}
