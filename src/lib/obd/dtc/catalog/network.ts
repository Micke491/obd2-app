import type { CatalogEntry } from '../types';

/**
 * U0000–U0FFF: the modules talking to each other.
 *
 * Module names here have to agree with `derive/modules.ts`, which names the
 * same modules for the codes this file does not list.
 */
export const NETWORK: Record<string, CatalogEntry> = {
  // ── The bus itself, U0001–U0075 ─────────────────────────────────────────
  U0001: {
    title: 'High speed CAN communication bus',
    brief:
      'The fast two-wire network that carries engine, brake and transmission data has a fault on the wiring itself, rather than one module having gone quiet.',
  },
  U0002: {
    title: 'High speed CAN communication bus performance',
    brief:
      'The fast network is still carrying messages but with more errors than it should. A damaged wire, a bad terminating resistor, or one module corrupting traffic.',
  },
  U0003: {
    title: 'High speed CAN communication bus positive line open',
    brief: 'One of the two network wires is broken, which normally takes several modules off the bus at once.',
  },
  U0010: {
    title: 'Medium speed CAN communication bus',
    brief:
      'The slower network, usually carrying comfort and body systems, has a wiring fault. The car drives, but features stop working together.',
  },
  U0073: {
    title: 'Control module communication bus A off',
    brief:
      'The reporting module has taken itself off the network after too many transmission errors. Something is corrupting the bus — a shorted wire, or a module dragging it down.',
  },
  U0074: {
    title: 'Control module communication bus B off',
    brief: 'The second network has shut itself down after repeated errors, taking whatever it carries with it.',
  },
  U0075: {
    title: 'Control module communication bus C off',
    brief: 'The third network has shut itself down after repeated errors.',
  },

  // ── Lost communication, U0100–U0186 ─────────────────────────────────────
  U0100: {
    title: 'Lost communication with the engine control module',
    brief:
      'The reporting module has stopped hearing from the engine computer. Either that computer is unpowered or dead, or the network wiring between them is broken.',
  },
  U0101: {
    title: 'Lost communication with the transmission control module',
    brief:
      'The transmission module has gone silent. The gearbox normally falls into a fixed-gear limp mode when this happens.',
  },
  U0102: {
    title: 'Lost communication with the transfer case control module',
    brief: 'The module that selects four-wheel drive has gone silent, so range and mode changes stop working.',
  },
  U0103: {
    title: 'Lost communication with the gear shift module',
    brief:
      'The module in the gear selector has gone silent, so the car may not know which gear you have asked for.',
  },
  U0104: {
    title: 'Lost communication with the cruise control module',
    brief: 'The cruise control module has gone silent, so cruise will not engage.',
  },
  U0105: {
    title: 'Lost communication with the fuel injector control module',
    brief:
      'The separate module that drives the injectors on some diesels has gone silent. The engine will not run properly without it.',
  },
  U0106: {
    title: 'Lost communication with the glow plug control module',
    brief:
      'The glow plug module has gone silent. A warm engine is unaffected; a cold one becomes much harder to start.',
  },
  U0107: {
    title: 'Lost communication with the throttle actuator control module',
    brief:
      'The module driving the electronic throttle has gone silent, which usually forces the engine into reduced power.',
  },
  U0108: {
    title: 'Lost communication with the alternative fuel control module',
    brief: 'The module managing a second fuel system, such as LPG or CNG, has gone silent.',
  },
  U0109: {
    title: 'Lost communication with the fuel pump control module',
    brief:
      'The module that varies fuel pump speed has gone silent. Fuel pressure then cannot be regulated, and the engine may not run.',
  },
  U0110: {
    title: 'Lost communication with the drive motor control module',
    brief: 'The module controlling an electric drive motor has gone silent, so electric drive is unavailable.',
  },
  U0111: {
    title: 'Lost communication with the battery energy control module',
    brief:
      'The module managing the high-voltage battery has gone silent. Hybrid and electric drive shut down when this happens.',
  },
  U0114: {
    title: 'Lost communication with the four-wheel-drive clutch control module',
    brief: 'The module that engages the four-wheel-drive clutch has gone silent, so drive stays at one axle.',
  },
  U0115: {
    title: 'Lost communication with the second engine control module',
    brief: 'The second engine computer, on engines that use two, has gone silent.',
  },
  U0121: {
    title: 'Lost communication with the ABS control module',
    brief:
      'The anti-lock brake module has gone silent. Ordinary braking still works, but ABS, traction control and stability control do not.',
  },
  U0122: {
    title: 'Lost communication with the vehicle dynamics control module',
    brief: 'The stability control module has gone silent, so the car cannot intervene in a slide.',
  },
  U0123: {
    title: 'Lost communication with the yaw rate sensor',
    brief:
      'The sensor that measures how fast the car is rotating has gone silent, which disables stability control.',
  },
  U0124: {
    title: 'Lost communication with the lateral acceleration sensor',
    brief: 'The sensor measuring sideways acceleration has gone silent, which disables stability control.',
  },
  U0125: {
    title: 'Lost communication with the multi-axis acceleration sensor',
    brief:
      'The combined motion sensor used by stability control and the airbag system has gone silent.',
  },
  U0126: {
    title: 'Lost communication with the steering angle sensor',
    brief:
      'The sensor reporting where the steering wheel is pointing has gone silent. Stability control cannot work without knowing where you are steering.',
  },
  U0127: {
    title: 'Lost communication with the tyre pressure monitoring module',
    brief: 'The tyre pressure module has gone silent, so pressures are no longer being watched.',
  },
  U0128: {
    title: 'Lost communication with the park brake control module',
    brief:
      'The electric parking brake module has gone silent. It may refuse to release, or refuse to apply.',
  },
  U0129: {
    title: 'Lost communication with the brake system control module',
    brief:
      'The brake control module has gone silent, taking the electronic brake functions with it.',
  },
  U0131: {
    title: 'Lost communication with the power steering control module',
    brief:
      'The electric power steering module has gone silent. The steering still works but becomes much heavier.',
  },
  U0140: {
    title: 'Lost communication with the body control module',
    brief:
      'The module handling lighting, locking, wipers and the alarm has gone silent. Expect several unrelated features to stop at once.',
  },
  U0151: {
    title: 'Lost communication with the restraints control module',
    brief:
      'The airbag module has gone silent. The airbags may not deploy in a crash, so this is worth fixing before a long trip.',
  },
  U0155: {
    title: 'Lost communication with the instrument cluster',
    brief:
      'The dashboard has gone silent. Gauges and warning lamps may be blank or frozen even though the car itself is fine.',
  },
  U0164: {
    title: 'Lost communication with the climate control module',
    brief: 'The heating and air conditioning module has gone silent, so climate settings stop responding.',
  },
  U0167: {
    title: 'Lost communication with the immobiliser control module',
    brief:
      'The immobiliser module has gone silent. The engine computer cannot confirm the key, so the engine may refuse to start.',
  },
  U0184: {
    title: 'Lost communication with the radio',
    brief: 'The radio or head unit has gone silent on the network — a fuse, its connector, or the unit itself.',
  },
  U0186: {
    title: 'Lost communication with the audio amplifier',
    brief: 'The separate audio amplifier has gone silent, so there is sound from the head unit but none from the speakers.',
  },

  // ── Software mismatch, U0300–U0302 ──────────────────────────────────────
  U0300: {
    title: 'Internal control module software incompatibility',
    brief:
      'Two modules are running software versions that were never meant to work together. This follows a module replacement or a partial update, not a wiring fault.',
  },
  U0301: {
    title: 'Software incompatibility with the engine control module',
    brief: 'Another module’s software does not match the engine computer’s version. Coding rather than repair.',
  },
  U0302: {
    title: 'Software incompatibility with the transmission control module',
    brief: 'Another module’s software does not match the transmission module’s version.',
  },

  // ── Invalid data, U0400–U0428 ───────────────────────────────────────────
  U0400: {
    title: 'Invalid data received',
    brief:
      'A module is still talking but sending numbers the receiver cannot use. That points at a sensor feeding it bad readings rather than at the network wiring.',
  },
  U0401: {
    title: 'Invalid data received from the engine control module',
    brief:
      'The engine computer is communicating, but the values it is sending do not make sense. Read that module’s own codes first — the cause is normally stored there.',
  },
  U0402: {
    title: 'Invalid data received from the transmission control module',
    brief: 'The transmission module is talking but sending values that do not make sense to the receiver.',
  },
  U0415: {
    title: 'Invalid data received from the ABS control module',
    brief:
      'The ABS module is communicating but sending implausible values — commonly a wheel speed sensor feeding it nonsense.',
  },
  U0416: {
    title: 'Invalid data received from the vehicle dynamics control module',
    brief: 'The stability control module is talking but sending values the receiver cannot use.',
  },
  U0418: {
    title: 'Invalid data received from the brake system control module',
    brief: 'The brake control module is talking but sending implausible values.',
  },
  U0422: {
    title: 'Invalid data received from the body control module',
    brief: 'The body control module is talking but sending values that do not make sense.',
  },
  U0428: {
    title: 'Invalid data received from the steering angle sensor',
    brief:
      'The steering angle sensor is reporting, but an angle that does not fit what the wheels and the yaw sensor say. It often just needs recalibrating after a steering or suspension repair.',
  },
};
