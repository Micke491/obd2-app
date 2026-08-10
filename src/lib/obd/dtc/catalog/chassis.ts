import type { CatalogEntry } from '../types';

/**
 * C0000–C0FFF: brakes, traction and stability.
 *
 * Short on purpose. Very little of the C range is standardised the way the
 * powertrain range is — most brands number their own chassis codes — so only
 * the entries that can be checked against the published generic list are here.
 * Anything else gets the chassis family description instead of a guess.
 */
export const CHASSIS: Record<string, CatalogEntry> = {
  C0035: {
    title: 'Left front wheel speed sensor circuit',
    brief:
      'The front left wheel speed sensor is not giving a usable signal. ABS and stability control switch themselves off, because they cannot compare that wheel with the others.',
  },
  C0040: {
    title: 'Right front wheel speed sensor circuit',
    brief:
      'The front right wheel speed sensor is not giving a usable signal — the sensor, its wiring, or a tone ring clogged with rust or debris.',
  },
  C0045: {
    title: 'Left rear wheel speed sensor circuit',
    brief:
      'The rear left wheel speed sensor is not giving a usable signal. Rear sensor wiring flexes with the suspension and breaks inside its insulation.',
  },
  C0050: {
    title: 'Right rear wheel speed sensor circuit',
    brief:
      'The rear right wheel speed sensor is not giving a usable signal — the sensor, its wiring, or a damaged tone ring on the hub.',
  },
  C0110: {
    title: 'ABS pump motor circuit malfunction',
    brief:
      'The pump inside the ABS unit, which builds the pressure ABS needs to release and reapply the brakes, is not responding. Ordinary braking is unaffected.',
  },
  C0121: {
    title: 'Valve relay circuit malfunction',
    brief:
      'The relay that powers the ABS solenoid valves is not switching. Without it the valves cannot modulate brake pressure, so ABS shuts down.',
  },
  C0161: {
    title: 'ABS or traction control brake switch circuit',
    brief:
      'The brake pedal signal the ABS module relies on is faulty, so it cannot tell when you are braking. Traction control is normally disabled with it.',
  },
  C0242: {
    title: 'Engine computer indicated traction control malfunction',
    brief:
      'The brake module asked the engine to reduce power for traction control and the engine computer reported it could not. The cause is usually stored as an engine code, not a brake one.',
  },
  C0265: {
    title: 'Electronic brake control module motor circuit',
    brief:
      'The circuit driving the ABS pump motor is open or shorted. The motor, its earth, or the heavy supply feeding it.',
  },
};
