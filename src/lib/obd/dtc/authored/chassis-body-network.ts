import type { AuthoredDtc } from '../types';

/**
 * The C, B and U codes people most often see.
 *
 * Generic OBD-II usually cannot read these directly — they live in the ABS or
 * body module — but people arrive with the number written on a garage invoice,
 * so they are worth explaining properly in the lookup.
 */
export const CHASSIS_BODY_NETWORK: Record<string, AuthoredDtc> = {
  C0035: {
    title: 'Left front wheel speed sensor circuit',
    meaning:
      'Each wheel has a speed sensor that the anti-lock brakes, traction control and stability ' +
      'systems all depend on. The signal from the left front wheel is missing or implausible, so ' +
      'those systems switch themselves off rather than act on a reading they cannot trust.',
    severity: 'serious',
    drive: 'drive-with-care',
    driveNote:
      'Normal braking still works exactly as usual. ABS and stability control do not, so leave ' +
      'more room and avoid hard braking in the wet.',
    symptoms: [
      'ABS and traction control warning lights on',
      'Stability control disabled',
      'Speedometer sometimes reading oddly',
      'ABS pulsing at very low speed for no reason',
    ],
    causes: [
      { text: 'Sensor tip packed with brake dust or metal filings', likelihood: 'common' },
      { text: 'Damaged sensor wiring where it flexes with the suspension', likelihood: 'common' },
      { text: 'Corroded connector behind the wheel arch', likelihood: 'common' },
      { text: 'Cracked or rusted reluctor ring on the hub', likelihood: 'possible' },
      { text: 'Failed wheel bearing with an integrated sensor', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Clean the sensor tip and its mounting hole', where: 'diy-moderate' },
      { text: 'Inspect the wiring along the suspension arm for chafing', where: 'diy-moderate' },
      { text: 'Compare all four wheel speeds while rolling — the faulty one reads zero or jumps', where: 'shop' },
      { text: 'Replace the wheel speed sensor', where: 'diy-moderate' },
    ],
    related: ['C0040', 'C0045', 'C0050'],
    system: 'chassis',
  },
  C0265: {
    title: 'Brake control module motor circuit',
    meaning:
      'The ABS unit has its own pump motor that releases and reapplies brake pressure many times ' +
      'a second. The module cannot drive that motor, so anti-lock braking is unavailable.',
    severity: 'serious',
    drive: 'drive-with-care',
    driveNote:
      'The brakes work normally in the ordinary sense — this is the anti-lock function, not the ' +
      'braking itself. Allow more stopping distance and avoid emergency stops on loose surfaces.',
    symptoms: [
      'ABS warning light on, often with traction control',
      'No pulsing under hard braking',
      'Sometimes a brake warning light too',
    ],
    causes: [
      { text: 'Corroded or loose ABS module connector', likelihood: 'common' },
      { text: 'Blown ABS pump fuse or failed relay', likelihood: 'common' },
      { text: 'Poor earth to the ABS unit', likelihood: 'possible' },
      { text: 'Failed pump motor or module', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Check the ABS fuses — there are usually two, one large', where: 'diy-easy' },
      { text: 'Inspect and reseat the ABS module connector', where: 'diy-moderate' },
      { text: 'Have the module tested; many can be rebuilt rather than replaced', where: 'shop' },
    ],
    related: ['C0035', 'U0121'],
    system: 'chassis',
  },
  U0073: {
    title: 'Control module communication bus off',
    meaning:
      'The network the modules use to talk to each other has shut down. One module has usually ' +
      'jammed the bus, or the two wires that carry it have shorted together or to the body. When ' +
      'the bus goes down, everything on it stops working at once.',
    severity: 'serious',
    drive: 'drive-with-care',
    driveNote:
      'Expect a dashboard full of lights and features that simply do not respond. The engine may ' +
      'run, but do not rely on anything else.',
    symptoms: [
      'Many warning lights at once',
      'Dashboard gauges dead or frozen',
      'Several systems unresponsive',
      'Sometimes a no-start',
    ],
    causes: [
      { text: 'Weak battery, or damage from a bad jump-start', likelihood: 'common' },
      { text: 'Water ingress into a connector or module', likelihood: 'common' },
      { text: 'One failed module dragging the whole bus down', likelihood: 'common' },
      { text: 'Chafed bus wiring shorting to the body', likelihood: 'possible' },
      { text: 'A badly fitted aftermarket accessory wired into the bus', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Charge the battery fully and retest — low voltage causes this surprisingly often', where: 'diy-easy' },
      { text: 'Disconnect any recently fitted aftermarket electronics', where: 'diy-easy' },
      { text: 'Have the bus resistance measured; a healthy CAN network reads about 60 ohms', where: 'shop' },
      { text: 'Unplug modules one at a time to find the one jamming the bus', where: 'shop' },
    ],
    related: ['U0001', 'U0100'],
    system: 'network',
  },
  B0001: {
    title: 'Driver airbag deployment control',
    meaning:
      'The restraints module continuously checks the resistance of every airbag circuit so it ' +
      'knows they will fire when needed. This one is out of range, so the module has disabled ' +
      'the system rather than risk an unintended or failed deployment.',
    severity: 'serious',
    drive: 'drive-with-care',
    driveNote:
      'The car drives normally, but the airbag may not deploy in a crash. Worth fixing before a ' +
      'long journey, and it is an automatic test failure in most countries.',
    symptoms: [
      'Airbag warning light stays on',
      'No other change in how the car behaves',
      'Fails a roadworthiness test',
    ],
    causes: [
      { text: 'Worn clock spring behind the steering wheel', likelihood: 'common' },
      { text: 'Loose or corroded connector under the seat or in the steering column', likelihood: 'common' },
      { text: 'Airbag module itself has failed', likelihood: 'possible' },
    ],
    fixes: [
      {
        text: 'Do not work on airbag wiring with the battery connected — disconnect it and wait ten minutes first',
        where: 'shop',
      },
      { text: 'Have the connectors under the steering column checked', where: 'shop' },
      { text: 'Have the clock spring replaced', where: 'shop' },
    ],
    related: ['B0002', 'U0151'],
    system: 'body',
  },
};
