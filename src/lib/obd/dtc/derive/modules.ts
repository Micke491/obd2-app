/**
 * Module names behind the U01xx "lost communication" codes.
 *
 * Keyed on the last two characters read as decimal, because that is how the
 * standard numbers them — U0121 is the ABS module, and 21 is twenty-one, not
 * 0x21. Only entries that can be checked against the catalog or the published
 * SAE list are here; anything else falls through to a generic phrase rather
 * than inventing a module name for somebody to go and unplug.
 *
 * U04xx ("invalid data received from…") is deliberately NOT run through this
 * table. Its numbering is compressed differently — U0121 is ABS but the
 * matching invalid-data code is U0415, not U0422 — so it gets an honest
 * unnamed description instead of a confidently wrong one.
 */
export const U01_MODULES: Record<number, string> = {
  0: 'the engine control module',
  1: 'the transmission control module',
  2: 'the transfer case control module',
  3: 'the gear shift module',
  4: 'the cruise control module',
  5: 'the fuel injector control module',
  6: 'the glow plug control module',
  7: 'the throttle actuator control module',
  8: 'the alternative fuel control module',
  9: 'the fuel pump control module',
  10: 'the drive motor control module',
  11: 'the battery energy control module',
  12: 'the battery energy control module',
  14: 'the four-wheel-drive clutch control module',
  15: 'the second engine control module',
  21: 'the ABS control module',
  22: 'the vehicle dynamics control module',
  23: 'the yaw rate sensor',
  24: 'the lateral acceleration sensor',
  25: 'the multi-axis acceleration sensor',
  26: 'the steering angle sensor',
  27: 'the tyre pressure monitoring module',
  28: 'the park brake control module',
  29: 'the brake system control module',
  30: 'the steering effort control module',
  31: 'the power steering control module',
  32: 'the ride level control module',
  40: 'the body control module',
  41: 'the body control module',
  42: 'the body control module',
  51: 'the restraints (airbag) control module',
  55: 'the instrument cluster',
  64: 'the climate control module',
  67: 'the immobiliser control module',
  84: 'the radio',
  86: 'the audio amplifier',
};

/** Losing one of these takes a safety system offline, not a convenience. */
const SAFETY_SUFFIXES = new Set([21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 51]);

/**
 * The module index as the standard counts it, or null when the last two
 * characters are not decimal digits and therefore outside the numbering.
 */
export function moduleSuffix(code: string): number | null {
  const tail = code.slice(3);
  if (!/^\d{2}$/.test(tail)) return null;
  return Number.parseInt(tail, 10);
}

export function moduleName(code: string): string {
  const suffix = moduleSuffix(code);
  if (suffix === null) return 'another control module';
  return U01_MODULES[suffix] ?? 'another control module';
}

export function isSafetyModule(code: string): boolean {
  const suffix = moduleSuffix(code);
  return suffix !== null && SAFETY_SUFFIXES.has(suffix);
}
