import type { DerivedDraft, DriveAdvice, DtcSeverity, DtcSystem } from '../types';
import type { ParsedCode } from './parse';

type Family = {
  /** Names the area of the car, e.g. "ignition system or misfire". */
  area: string;
  /** One paragraph explaining what codes in this range are about. */
  about: string;
  system: DtcSystem;
  severity: DtcSeverity;
  drive: DriveAdvice;
  driveNote: string;
  symptoms: string[];
};

const POWERTRAIN_SYMPTOMS = [
  'Check engine light on',
  'Possible change in how the engine idles, pulls or starts',
  'Worse fuel economy',
];

/** Keyed on the third character of a P0xxx / P2xxx code. */
const P_FAMILIES: Record<number, Family> = {
  0x0: {
    area: 'fuel and air metering',
    about:
      'Codes in this range come from the sensors that measure how much air the engine is ' +
      'drawing in and how much fuel it is being given — the air flow meter, the manifold ' +
      'pressure sensor, the throttle position sensor and the oxygen sensors.',
    system: 'fuel-air',
    severity: 'moderate',
    drive: 'drive-with-care',
    driveNote:
      'The engine falls back to estimated values, so it runs but less efficiently. Sustained ' +
      'wrong fuelling eventually harms the catalytic converter.',
    symptoms: POWERTRAIN_SYMPTOMS,
  },
  0x1: {
    area: 'fuel and air metering',
    about:
      'Codes in this range cover fuel and air metering — the mixture the engine is being fed, ' +
      'the sensors that measure it, and the fuel trims the computer applies to correct it.',
    system: 'fuel-air',
    severity: 'moderate',
    drive: 'drive-with-care',
    driveNote:
      'The engine falls back to estimated values, so it runs but less efficiently. Sustained ' +
      'wrong fuelling eventually harms the catalytic converter.',
    symptoms: POWERTRAIN_SYMPTOMS,
  },
  0x2: {
    area: 'injector circuits',
    about:
      'Codes in this range concern the fuel injectors and the circuits that drive them — the ' +
      'electrical side of getting fuel into each cylinder, rather than the air side.',
    system: 'injector',
    severity: 'serious',
    drive: 'limp-to-shop',
    driveNote:
      'A cylinder that is fuelled wrongly will misfire, and raw fuel in a hot exhaust damages ' +
      'the catalytic converter.',
    symptoms: ['Rough idle', 'Loss of power', 'Hard starting', 'Check engine light on'],
  },
  0x3: {
    area: 'the ignition system or misfire detection',
    about:
      'Codes in this range come from the ignition system and the engine computer’s misfire ' +
      'monitor, which watches how evenly the crankshaft accelerates on each power stroke.',
    system: 'ignition',
    severity: 'serious',
    drive: 'limp-to-shop',
    driveNote:
      'Unburnt fuel reaching a hot catalytic converter destroys it. If the check engine light ' +
      'is flashing, stop as soon as it is safe.',
    symptoms: [
      'The engine shakes or stumbles',
      'Loss of power',
      'Check engine light on, or flashing under load',
    ],
  },
  0x4: {
    area: 'the emission control systems',
    about:
      'Codes in this range come from the systems that clean up what leaves the engine — the ' +
      'catalytic converter, the exhaust gas recirculation valve, the fuel-vapour (evaporative) ' +
      'system and the secondary air injection.',
    system: 'emissions',
    severity: 'minor',
    drive: 'safe-to-drive',
    driveNote:
      'These faults rarely affect how the car drives, but they will fail an emissions test.',
    symptoms: [
      'Check engine light on',
      'Often no change you can feel',
      'Fails an emissions test',
      'Sometimes a fuel smell, if the vapour system is leaking',
    ],
  },
  0x5: {
    area: 'vehicle speed, idle control and auxiliary inputs',
    about:
      'Codes in this range cover road speed sensing, idle speed control, cruise control and the ' +
      'assorted switches and inputs the engine computer reads — including oil pressure and ' +
      'coolant level.',
    system: 'speed-idle',
    severity: 'moderate',
    drive: 'drive-with-care',
    driveNote:
      'Most of these affect convenience features, but a few — oil pressure in particular — are ' +
      'serious. Check the gauges before continuing.',
    symptoms: [
      'Erratic or hunting idle',
      'Cruise control stops working',
      'Speedometer behaving oddly',
      'Check engine light on',
    ],
  },
  0x6: {
    area: 'the engine computer itself and its output circuits',
    about:
      'Codes in this range are raised by the engine control module about its own internal ' +
      'checks, its memory, its power supply, or the circuits through which it drives relays ' +
      'and actuators.',
    system: 'computer',
    severity: 'serious',
    drive: 'limp-to-shop',
    driveNote:
      'When the computer doubts its own readings it protects the engine by limiting power, and ' +
      'behaviour can change without warning.',
    symptoms: [
      'Check engine light on',
      'Reduced power or a limp-home mode',
      'Several unrelated codes appearing together',
      'Hard starting or a no-start',
    ],
  },
  0x7: {
    area: 'the transmission',
    about:
      'Codes in this range come from the automatic transmission — its solenoids, its speed and ' +
      'pressure sensors, its fluid temperature, and the ratios it is actually achieving versus ' +
      'the ones it commanded.',
    system: 'transmission',
    severity: 'serious',
    drive: 'limp-to-shop',
    driveNote:
      'A slipping or wrongly shifting transmission wears quickly, and many cars drop into a ' +
      'fixed-gear limp mode to protect it.',
    symptoms: [
      'Harsh, delayed or missing gearshifts',
      'Stuck in one gear',
      'Slipping under load',
      'Check engine light on',
    ],
  },
  0x8: {
    area: 'the transmission',
    about:
      'Codes in this range come from transmission control — gear selection, clutch and shift ' +
      'actuators, and the switches that tell the computer which gear has been asked for.',
    system: 'transmission',
    severity: 'serious',
    drive: 'limp-to-shop',
    driveNote:
      'A slipping or wrongly shifting transmission wears quickly, and many cars drop into a ' +
      'fixed-gear limp mode to protect it.',
    symptoms: ['Harsh or missing gearshifts', 'Stuck in one gear', 'Check engine light on'],
  },
  0x9: {
    area: 'the transmission and its control module',
    about:
      'Codes in this range cover transmission control module faults and the communication ' +
      'between it and the rest of the car.',
    system: 'transmission',
    severity: 'serious',
    drive: 'limp-to-shop',
    driveNote: 'The transmission may drop into a protective limp mode without warning.',
    symptoms: ['Harsh or missing gearshifts', 'Stuck in one gear', 'Check engine light on'],
  },
  0xa: {
    area: 'the hybrid propulsion system',
    about:
      'Codes in this range come from the hybrid drive — the high-voltage battery, the drive ' +
      'motors and generators, and the inverter that moves power between them.',
    system: 'hybrid',
    severity: 'serious',
    drive: 'drive-with-care',
    driveNote:
      'High-voltage systems are genuinely dangerous to work on. Have this diagnosed rather ' +
      'than opening anything orange yourself.',
    symptoms: [
      'Reduced electric assistance or none at all',
      'Engine running more than usual',
      'Warning lights specific to the hybrid system',
    ],
  },
  0xb: {
    area: 'the hybrid propulsion system',
    about:
      'Codes in this range come from hybrid battery and motor control, including cell balance, ' +
      'cooling and the sensors that monitor them.',
    system: 'hybrid',
    severity: 'serious',
    drive: 'drive-with-care',
    driveNote:
      'High-voltage systems are genuinely dangerous to work on. Have this diagnosed rather ' +
      'than opening anything orange yourself.',
    symptoms: ['Reduced electric assistance', 'Hybrid warning lights', 'Worse fuel economy'],
  },
  0xc: {
    area: 'the hybrid propulsion system',
    about:
      'Codes in this range cover hybrid drive control and the coordination between the engine ' +
      'and the electric motors.',
    system: 'hybrid',
    severity: 'serious',
    drive: 'drive-with-care',
    driveNote: 'Have the hybrid system diagnosed properly rather than working on it yourself.',
    symptoms: ['Reduced electric assistance', 'Hybrid warning lights'],
  },
};

const P_FALLBACK: Family = {
  area: 'the engine or transmission',
  about:
    'This is a powertrain code, so it concerns the engine, the transmission, or the emission ' +
    'controls attached to them.',
  system: 'unknown',
  severity: 'moderate',
  drive: 'drive-with-care',
  driveNote: 'Without knowing the exact fault, treat any warning light as a reason to get it read.',
  symptoms: POWERTRAIN_SYMPTOMS,
};

const C_FAMILY: Family = {
  area: 'the chassis',
  about:
    'Chassis codes cover the systems that make the car stop and steer — anti-lock brakes, ' +
    'traction and stability control, power steering, suspension and the wheel speed sensors ' +
    'they all depend on.',
  system: 'chassis',
  severity: 'serious',
  drive: 'drive-with-care',
  driveNote:
    'Normal braking still works, but ABS and stability control may not. Leave more room and ' +
    'avoid hard braking in the wet.',
  symptoms: [
    'ABS or traction control warning light on',
    'Stability control switching itself off',
    'Brake pedal feels different under hard braking',
  ],
};

const B_FAMILY: Family = {
  area: 'the body',
  about:
    'Body codes cover the systems in the cabin and shell — airbags and seatbelt pretensioners, ' +
    'climate control, lighting, locking, seats and mirrors.',
  system: 'body',
  severity: 'serious',
  drive: 'drive-with-care',
  driveNote:
    'If this is a restraint code, the airbag may not deploy in a crash. That is worth fixing ' +
    'before a long trip even though the car drives normally.',
  symptoms: [
    'Airbag or restraint warning light on',
    'A comfort or lighting feature not working',
    'Warning light that stays on after starting',
  ],
};

const U_FAMILY: Family = {
  area: 'the vehicle network',
  about:
    'Network codes are about the control modules talking to each other. A modern car is a ' +
    'group of small computers sharing a two-wire bus, and these codes mean one of them is ' +
    'missing, silent, or sending data the others cannot use.',
  system: 'network',
  severity: 'moderate',
  drive: 'drive-with-care',
  driveNote:
    'The car usually drives normally, but whatever the missing module controls will not work.',
  symptoms: [
    'Several warning lights at once',
    'A feature that stops working entirely',
    'Codes that come back after clearing',
  ],
};

const NETWORK_CAUSES = [
  { text: 'Weak battery, or a recent jump-start or battery change', likelihood: 'common' as const },
  { text: 'Blown fuse or corroded connector at one of the modules', likelihood: 'common' as const },
  { text: 'Damaged wiring in the network bus', likelihood: 'possible' as const },
];

const GENERIC_CAUSES = [
  { text: 'A failed or out-of-range sensor in that system', likelihood: 'common' as const },
  { text: 'Damaged, corroded or disconnected wiring', likelihood: 'common' as const },
  { text: 'A worn mechanical part the sensor is correctly reporting on', likelihood: 'possible' as const },
  { text: 'A control module fault', likelihood: 'rare' as const },
];

const GENERIC_FIXES = [
  { text: 'Note whether the fault is present now or was stored earlier', where: 'diy-easy' as const },
  {
    text: 'Inspect the wiring and connectors in that area for damage or corrosion',
    where: 'diy-moderate' as const,
  },
  {
    text: 'Compare the live sensor readings against what the car should be showing',
    where: 'diy-moderate' as const,
  },
  { text: 'Have the specific circuit tested before replacing any part', where: 'shop' as const },
];

function familyFor(code: ParsedCode): Family {
  switch (code.letter) {
    case 'P':
      return P_FAMILIES[code.systemDigit] ?? P_FALLBACK;
    case 'C':
      return C_FAMILY;
    case 'B':
      return B_FAMILY;
    case 'U':
      return U_FAMILY;
    default:
      return P_FALLBACK;
  }
}

export function familyArea(code: ParsedCode): string {
  return familyFor(code).area;
}

export function familySystem(code: ParsedCode): string {
  return familyFor(code).system;
}

/**
 * The last resort, and still real prose.
 *
 * A code that reaches this point has no hand-written entry, no SAE title and no
 * matching derive rule — but its position in the numbering still says which
 * part of the car it belongs to, and whether the manufacturer or SAE defined
 * it. That is genuinely useful, so it gets said properly rather than shown as
 * a bare number with a shrug.
 */
export function buildFamilyDraft(code: ParsedCode): DerivedDraft {
  const family = familyFor(code);
  const manufacturer = !code.generic;

  const meaning = manufacturer
    ? `${family.about} This particular number is defined by the vehicle manufacturer rather ` +
      'than by the SAE standard, so its exact wording lives in that brand’s own service ' +
      'information. A generic scanner can read the code but cannot name it.'
    : `${family.about} This particular number is part of the standard set but is not in this ` +
      'app’s description list, so the area is certain while the exact fault is not.';

  return {
    title: manufacturer
      ? `Manufacturer code — ${family.area}`
      : `Standard code — ${family.area}`,
    meaning,
    severity: manufacturer ? 'moderate' : family.severity,
    drive: manufacturer ? 'unknown' : family.drive,
    driveNote: manufacturer
      ? 'Urgency cannot be judged from the number alone. If a warning light is flashing, or the ' +
        'car is driving badly, stop and have it read properly.'
      : family.driveNote,
    symptoms: family.symptoms,
    causes: code.letter === 'U' ? NETWORK_CAUSES : GENERIC_CAUSES,
    fixes: GENERIC_FIXES,
    related: [],
    system: family.system,
    locus: null,
  };
}

/** Used when an SAE title is known but no rule matched — better severity guess. */
export function buildCatalogDraft(code: ParsedCode, title: string): DerivedDraft {
  const family = familyFor(code);
  return {
    title,
    meaning:
      `${title}. ${family.about} The wording above is the standard SAE definition for this code; ` +
      'what has actually failed still needs testing on the car.',
    severity: family.severity,
    drive: family.drive,
    driveNote: family.driveNote,
    symptoms: family.symptoms,
    causes: code.letter === 'U' ? NETWORK_CAUSES : GENERIC_CAUSES,
    fixes: GENERIC_FIXES,
    related: [],
    system: family.system,
    locus: null,
  };
}
