import type { AuthoredDtc } from '../types';

/** Speed and idle control, the control module itself, and the transmission. */
export const MISC: Record<string, AuthoredDtc> = {
  P0011: {
    title: 'Camshaft timing over-advanced, bank 1',
    meaning:
      'Variable valve timing lets the engine rotate its camshaft slightly to suit the revs. The ' +
      'computer asked for one position and measured another. Nearly always an oil problem: the ' +
      'actuator is moved by oil pressure through a fine filter screen.',
    severity: 'moderate',
    drive: 'drive-with-care',
    driveNote:
      'The engine will run, but if it is caused by low or dirty oil the same neglect is wearing ' +
      'other things. Check the oil level today.',
    symptoms: [
      'Rough idle and rattling on start-up',
      'Loss of power at one end of the rev range',
      'Worse fuel economy',
      'Check engine light on',
    ],
    causes: [
      { text: 'Low oil level, or oil long overdue a change', likelihood: 'common' },
      { text: 'Blocked variable valve timing filter screen', likelihood: 'common' },
      { text: 'Stuck oil control solenoid', likelihood: 'common' },
      { text: 'Worn timing chain or tensioner', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Check the oil level and condition before anything else', where: 'diy-easy' },
      { text: 'Change the oil and filter with the correct grade', where: 'diy-moderate' },
      { text: 'Clean or replace the oil control solenoid and its screen', where: 'diy-moderate' },
      { text: 'Have the timing chain stretch measured', where: 'shop' },
    ],
    related: ['P0010', 'P0014', 'P0016'],
    system: 'computer',
  },
  P0016: {
    title: 'Crankshaft and camshaft positions do not agree',
    meaning:
      'The engine computer compares where the crankshaft says the engine is with where the ' +
      'camshaft says it is. They disagree by more than tolerance, which means the mechanical ' +
      'link between them has moved — or one of the two sensors is lying.',
    severity: 'serious',
    drive: 'limp-to-shop',
    driveNote:
      'If a timing chain has genuinely jumped, continuing to drive risks the pistons meeting ' +
      'the valves. That is an engine rebuild, not a repair.',
    symptoms: [
      'Rattle from the front of the engine, worst on cold start',
      'Rough running and long cranking',
      'Loss of power',
      'Check engine light on',
    ],
    causes: [
      { text: 'Stretched timing chain or a worn tensioner', likelihood: 'common' },
      { text: 'Variable valve timing actuator stuck', likelihood: 'common' },
      { text: 'Low oil pressure from a low level or a blocked screen', likelihood: 'possible' },
      { text: 'Failed crankshaft or camshaft position sensor', likelihood: 'possible' },
      { text: 'Timing belt fitted or slipped one tooth out', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Check the oil level and listen for chain rattle on a cold start', where: 'diy-easy' },
      { text: 'Have the timing components inspected before driving further', where: 'shop' },
      { text: 'Verify cam-to-crank alignment against the workshop marks', where: 'shop' },
    ],
    related: ['P0011', 'P0335', 'P0340'],
    system: 'computer',
  },
  P0500: {
    title: 'Vehicle speed sensor fault',
    meaning:
      'The engine computer is not getting a usable road speed signal. On most cars that comes ' +
      'from a sensor on the gearbox or from the anti-lock brake wheel sensors, and several ' +
      'systems depend on it.',
    severity: 'moderate',
    drive: 'drive-with-care',
    driveNote:
      'Cruise control and some transmission behaviour will be off, and the speedometer may be ' +
      'wrong — so watch your speed against a phone GPS.',
    symptoms: [
      'Speedometer reading zero or jumping about',
      'Cruise control refusing to engage',
      'Harsh or badly timed gearshifts',
      'ABS light on as well',
    ],
    causes: [
      { text: 'Failed speed sensor', likelihood: 'common' },
      { text: 'Damaged or corroded sensor wiring', likelihood: 'common' },
      { text: 'Faulty anti-lock brake wheel speed sensor feeding the network', likelihood: 'possible' },
      { text: 'Damaged reluctor ring on the driveshaft', likelihood: 'rare' },
    ],
    fixes: [
      { text: 'Check the sensor connector for oil and corrosion', where: 'diy-moderate' },
      { text: 'Read the codes stored in the ABS module too', where: 'shop' },
      { text: 'Replace the vehicle speed sensor', where: 'diy-moderate' },
    ],
    related: ['P0501', 'P0502'],
    system: 'speed-idle',
  },
  P0505: {
    title: 'Idle control system fault',
    meaning:
      'The engine computer controls idle speed by metering a small amount of air past the ' +
      'throttle. It has asked for an idle speed and not been able to hold it, which usually ' +
      'means the passage is carboned up or the throttle body is dirty.',
    severity: 'moderate',
    drive: 'drive-with-care',
    driveNote:
      'The risk is stalling at junctions rather than damage. Be ready for it until it is fixed.',
    symptoms: [
      'Idle hunting up and down',
      'Stalling when coming to a stop',
      'Idle too high or too low',
      'Check engine light on',
    ],
    causes: [
      { text: 'Carbon build-up in the throttle body or idle air passage', likelihood: 'common' },
      { text: 'Vacuum leak letting in unmetered air', likelihood: 'common' },
      { text: 'Failed idle air control valve', likelihood: 'possible' },
      { text: 'Throttle position sensor out of calibration', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Clean the throttle body with throttle cleaner and a soft cloth', where: 'diy-moderate' },
      { text: 'Check the vacuum and breather hoses for splits', where: 'diy-easy' },
      { text: 'Relearn the idle position after cleaning, as the workshop procedure describes', where: 'shop' },
    ],
    related: ['P0506', 'P0507', 'P0171'],
    system: 'speed-idle',
  },
  P0562: {
    title: 'System voltage too low',
    meaning:
      'The engine computer has measured its own supply voltage below the acceptable range while ' +
      'the engine was running. Modules behave unpredictably when they are underfed, so a low ' +
      'voltage often drags a crowd of unrelated codes in with it.',
    severity: 'serious',
    drive: 'limp-to-shop',
    driveNote:
      'If the alternator is not charging, the car is running on battery alone and will stop ' +
      'when it runs out — usually within an hour, sooner at night.',
    symptoms: [
      'Battery warning light on',
      'Dim or flickering headlights',
      'Several unrelated warning lights at once',
      'Slow or failed starting',
    ],
    causes: [
      { text: 'Alternator not charging', likelihood: 'common' },
      { text: 'Worn or slipping alternator belt', likelihood: 'common' },
      { text: 'Corroded battery terminals or a poor earth strap', likelihood: 'common' },
      { text: 'Battery at the end of its life', likelihood: 'common' },
    ],
    fixes: [
      { text: 'Check the Live data module voltage — a healthy system reads 13.5–14.5 V running', where: 'diy-easy' },
      { text: 'Clean the battery terminals and check the earth strap', where: 'diy-easy' },
      { text: 'Check the belt tension and condition', where: 'diy-easy' },
      { text: 'Have the battery and alternator tested', where: 'shop' },
    ],
    related: ['P0563'],
    system: 'computer',
  },
  P0700: {
    title: 'Transmission control system fault',
    meaning:
      'This code is a pointer, not a fault in itself. The transmission control module has ' +
      'stored a code of its own and asked the engine computer to turn the light on. The real ' +
      'detail lives in the transmission module, which generic scanners often cannot reach.',
    severity: 'serious',
    drive: 'limp-to-shop',
    driveNote:
      'The transmission may already be in a protective limp mode. Driving it hard while it is ' +
      'slipping causes real, expensive wear.',
    symptoms: [
      'Harsh, delayed or missing gearshifts',
      'Stuck in one gear',
      'Transmission warning light',
      'Check engine light on',
    ],
    causes: [
      { text: 'A specific transmission fault stored in its own module', likelihood: 'common' },
      { text: 'Low or burnt transmission fluid', likelihood: 'common' },
      { text: 'Failing shift solenoid', likelihood: 'possible' },
      { text: 'Wiring fault to the transmission module', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Check the transmission fluid level and colour where the car allows it', where: 'diy-moderate' },
      { text: 'Have the transmission module read with a scanner that can address it directly', where: 'shop' },
      { text: 'Fix the code found there — P0700 clears itself once the real fault is gone', where: 'shop' },
    ],
    related: ['P0730', 'P0740'],
    system: 'transmission',
  },
  P0740: {
    title: 'Torque converter clutch fault',
    meaning:
      'An automatic gearbox drives through a fluid coupling that always slips a little. At ' +
      'steady speeds a clutch locks it solid to save fuel. The computer has commanded that lock ' +
      'and not seen the engine speed settle as it should.',
    severity: 'serious',
    drive: 'limp-to-shop',
    driveNote:
      'A converter clutch slipping instead of locking generates heat, and heat is what kills ' +
      'automatic gearboxes.',
    symptoms: [
      'Shuddering at steady cruising speed, like driving over rumble strips',
      'Engine speed rising without the car accelerating',
      'Worse fuel economy on the motorway',
      'Transmission running hot',
    ],
    causes: [
      { text: 'Low or degraded transmission fluid', likelihood: 'common' },
      { text: 'Failed lock-up solenoid', likelihood: 'common' },
      { text: 'Worn torque converter clutch', likelihood: 'possible' },
      { text: 'Blocked valve body passages', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Check the transmission fluid level and colour', where: 'diy-moderate' },
      { text: 'Have the fluid and filter changed with the correct specification', where: 'shop' },
      { text: 'Have the lock-up solenoid tested', where: 'shop' },
    ],
    related: ['P0700', 'P0741'],
    system: 'transmission',
  },
};
