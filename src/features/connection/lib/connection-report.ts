/**
 * Turning a failed connection into something worth reading.
 *
 * "Check the adapter is pushed fully in and the ignition is on" covers both
 * possible faults and helps with neither. The adapter already knows which one it
 * is looking at — OBD pin 16 is powered whenever the adapter is seated, so the
 * voltage separates a car that is not talking from an adapter that is not really
 * in the port — and saying so turns the message into one thing to go and do.
 */

/** Volts out of an `ATRV` reply such as `12.4V`. */
export function parsePortVoltage(raw: string): number | null {
  const match = /(\d+(?:\.\d+)?)\s*V/i.exec(raw);
  if (!match) return null;

  const volts = Number.parseFloat(match[1]);
  return Number.isFinite(volts) ? volts : null;
}

/**
 * Anything below this at pin 16 means the adapter is not really in the port, or
 * the socket is dead. A car with the ignition off still sits above it.
 */
const PORT_POWERED_VOLTS = 11;

export function describeUnreachableCar(heard: string | null, volts: number | null): string {
  const last = heard ? ` (last: ${heard})` : '';

  if (volts !== null && volts >= PORT_POWERED_VOLTS) {
    return (
      `The car never answered, on any protocol${last}. The adapter has ${volts.toFixed(1)}V at ` +
      'the port, so it is plugged in properly — turn the ignition on, far enough for the dash ' +
      'lights to come up, and connect again.'
    );
  }

  if (volts !== null) {
    return (
      `The car never answered, on any protocol${last}. Only ${volts.toFixed(1)}V at the OBD ` +
      'port: push the adapter fully in, and check the fuse for the diagnostic socket.'
    );
  }

  return (
    `The car never answered, on any protocol${last}. Check the ignition is on and the adapter ` +
    'is pushed fully into the port.'
  );
}
