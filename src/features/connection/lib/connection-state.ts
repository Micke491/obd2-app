import type { ObdConnectionState } from '../types';

/**
 * The connection state, and the one transition that has to be careful with it.
 *
 * Kept out of the provider so it can be checked without a React tree or a
 * Bluetooth radio — this is where the app decides what a driver is allowed to
 * read after an attempt fails, and it was silently throwing that away.
 */
export const IDLE_STATE: ObdConnectionState = {
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

/**
 * What to show once the adapter has dropped the Bluetooth link.
 *
 * Everything describing a live link has to go: a protocol and a sensor list
 * left behind read as current, which is how a dashboard ends up showing the
 * last numbers it happened to read as though the car were still sending them.
 *
 * The report of the attempt that just failed is the exception, and the reason
 * this is a function rather than a spread of `IDLE_STATE`. A clone adapter
 * drops the link seconds after a sweep gives up on it — well before anyone has
 * walked to the Adapter screen to find out why — and resetting to idle took the
 * trace with it. The screen said "nothing recorded yet" after every single
 * failure, so the one record of which protocols were tried and what came back
 * never survived long enough to be read. For the same reason a diagnosis
 * already reached is kept: "the car never answered on any protocol" is worth
 * more than the drop that followed it.
 */
export function stateAfterAdapterDropped(prev: ObdConnectionState): ObdConnectionState {
  return {
    ...IDLE_STATE,
    status: 'error',
    log: prev.log,
    error: prev.error ?? 'The adapter disconnected. Check it is seated firmly in the OBD port.',
  };
}
