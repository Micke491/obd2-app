import type { DerivedDraft } from '../types';
import type { CodeLetter, ParsedCode } from './parse';
import { O2_FAULT_TEXT, O2_POSITIONS, describeO2Position, isUpstream } from './o2-table';
import { isSafetyModule, moduleName } from './modules';

export type DeriveRule = {
  id: string;
  letter: CodeLetter;
  /** Inclusive bounds on ParsedCode.numeric — always written in hex. */
  from: number;
  to: number;
  build: (code: ParsedCode) => DerivedDraft;
};

const hex2 = (n: number) => n.toString(16).toUpperCase().padStart(2, '0');

/** Trailing hex digits A–C are cylinders 10–12, so a plain subtraction works. */
const cylinderOf = (code: ParsedCode, base: number) => code.numeric - base;

const RULES: DeriveRule[] = [
  // ─── Misfire, P0301–P030C ────────────────────────────────────────────────
  {
    id: 'misfire-cylinder',
    letter: 'P',
    from: 0x0301,
    to: 0x030c,
    build: (code) => {
      const cylinder = cylinderOf(code, 0x0300);
      return {
        title: `Cylinder ${cylinder} misfire detected`,
        meaning:
          `Cylinder ${cylinder} is not burning its fuel properly. The engine computer watches ` +
          'how evenly the crankshaft speeds up on each power stroke, and this cylinder is ' +
          'falling short of the others. Unburnt fuel then passes into the exhaust.',
        severity: 'serious',
        drive: 'limp-to-shop',
        driveNote:
          'Unburnt fuel reaching a hot catalytic converter destroys it, and that repair costs ' +
          'many times what fixing the misfire does.',
        symptoms: [
          'The engine shakes or stumbles, worst at idle',
          'Noticeably down on power',
          'Higher fuel consumption',
          'Check engine light on, or flashing under load',
        ],
        causes: [
          { text: `Worn or fouled spark plug in cylinder ${cylinder}`, likelihood: 'common' },
          { text: `Failing ignition coil on cylinder ${cylinder}`, likelihood: 'common' },
          { text: `Clogged or leaking fuel injector on cylinder ${cylinder}`, likelihood: 'possible' },
          { text: 'Vacuum leak on the intake manifold', likelihood: 'possible' },
          { text: 'Low compression — burnt valve, worn rings or a head gasket leak', likelihood: 'rare' },
        ],
        fixes: [
          { text: `Inspect and replace the spark plug in cylinder ${cylinder}`, where: 'diy-easy' },
          {
            text: `Swap the coil with a neighbouring cylinder; if the misfire follows it, replace that coil`,
            where: 'diy-moderate',
          },
          { text: 'Check for intake vacuum leaks with a smoke test', where: 'shop' },
          { text: 'Run a compression or leak-down test on the cylinder', where: 'shop' },
        ],
        related: ['P0300', `P03${hex2(0x50 + cylinder)}`],
        system: 'ignition',
        locus: `Cylinder ${cylinder}`,
      };
    },
  },

  // ─── Injector circuit, P0201–P020C ───────────────────────────────────────
  {
    id: 'injector-circuit',
    letter: 'P',
    from: 0x0201,
    to: 0x020c,
    build: (code) => {
      const cylinder = cylinderOf(code, 0x0200);
      return {
        title: `Injector circuit fault, cylinder ${cylinder}`,
        meaning:
          `The engine computer cannot drive the fuel injector on cylinder ${cylinder} correctly. ` +
          'This is an electrical fault in the wiring or the injector itself, rather than a ' +
          'judgement about how the cylinder is running.',
        severity: 'serious',
        drive: 'limp-to-shop',
        driveNote:
          'A cylinder that is not being fuelled will misfire, and the raw fuel or extra heat ' +
          'that follows can damage the catalytic converter.',
        symptoms: [
          'Rough idle and a shaking engine',
          'Down on power, sometimes with a dead cylinder',
          'Hard starting',
        ],
        causes: [
          { text: `Failed injector on cylinder ${cylinder}`, likelihood: 'common' },
          { text: 'Damaged, chafed or corroded injector wiring or connector', likelihood: 'common' },
          { text: 'Injector driver circuit inside the engine computer has failed', likelihood: 'rare' },
        ],
        fixes: [
          { text: 'Check the injector connector and wiring for damage or corrosion', where: 'diy-moderate' },
          { text: 'Measure the injector coil resistance against the workshop spec', where: 'diy-moderate' },
          { text: 'Replace the injector', where: 'shop' },
        ],
        related: [`P03${hex2(cylinder)}`],
        system: 'injector',
        locus: `Cylinder ${cylinder}`,
      };
    },
  },

  // ─── Ignition coil, P0351–P035C ──────────────────────────────────────────
  {
    id: 'ignition-coil',
    letter: 'P',
    from: 0x0351,
    to: 0x035c,
    build: (code) => {
      const cylinder = cylinderOf(code, 0x0350);
      return {
        title: `Ignition coil ${cylinder} circuit fault`,
        meaning:
          `The engine computer is not seeing the expected electrical behaviour from the ignition ` +
          `coil on cylinder ${cylinder}. Without a healthy spark that cylinder cannot burn its fuel.`,
        severity: 'serious',
        drive: 'limp-to-shop',
        driveNote:
          'A dead coil means a dead cylinder, and the unburnt fuel it sends into the exhaust ' +
          'damages the catalytic converter.',
        symptoms: ['Engine shakes and stumbles', 'Clear loss of power', 'Check engine light on'],
        causes: [
          { text: `Failed ignition coil on cylinder ${cylinder}`, likelihood: 'common' },
          { text: 'Broken or corroded coil connector or wiring', likelihood: 'common' },
          { text: 'Coil driver circuit inside the engine computer has failed', likelihood: 'rare' },
        ],
        fixes: [
          { text: 'Inspect the coil connector and its wiring', where: 'diy-easy' },
          { text: 'Swap the coil with a neighbouring cylinder and re-read the codes', where: 'diy-moderate' },
          { text: `Replace the coil on cylinder ${cylinder}`, where: 'diy-moderate' },
        ],
        related: [`P03${hex2(cylinder)}`],
        system: 'ignition',
        locus: `Cylinder ${cylinder}`,
      };
    },
  },

  // ─── Glow plug, P0671–P067C ──────────────────────────────────────────────
  {
    id: 'glow-plug',
    letter: 'P',
    from: 0x0671,
    to: 0x067c,
    build: (code) => {
      const cylinder = cylinderOf(code, 0x0670);
      return {
        title: `Glow plug circuit fault, cylinder ${cylinder}`,
        meaning:
          `The glow plug circuit for cylinder ${cylinder} is not behaving as expected. Glow plugs ` +
          'pre-heat a diesel cylinder so it will fire when cold; they play no part once the ' +
          'engine is warm.',
        severity: 'minor',
        drive: 'safe-to-drive',
        driveNote: 'A warm engine runs normally — you will only notice this on a cold start.',
        symptoms: [
          'Hard starting when cold',
          'White smoke and rough running for the first minute',
          'No symptoms at all in warm weather',
        ],
        causes: [
          { text: `Failed glow plug on cylinder ${cylinder}`, likelihood: 'common' },
          { text: 'Broken glow plug wiring or connector', likelihood: 'possible' },
          { text: 'Faulty glow plug control module', likelihood: 'possible' },
        ],
        fixes: [
          { text: 'Measure the glow plug resistance; a good one reads under a few ohms', where: 'diy-moderate' },
          { text: `Replace the glow plug on cylinder ${cylinder}`, where: 'shop' },
        ],
        related: [],
        system: 'computer',
        locus: `Cylinder ${cylinder}`,
      };
    },
  },

  // ─── Oxygen sensors, P0130–P0167 ─────────────────────────────────────────
  {
    id: 'oxygen-sensor',
    letter: 'P',
    from: 0x0130,
    to: 0x0167,
    build: (code) => {
      const position = O2_POSITIONS[code.raw];
      const locus = position ? describeO2Position(position) : null;
      const where = locus ? locus.replace(' · ', ', ').toLowerCase() : 'one of the oxygen sensors';
      const fault = position ? O2_FAULT_TEXT[position.fault] : 'the sensor circuit is faulty';
      const upstream = position ? isUpstream(position) : true;
      const heater = position?.fault === 'heater';

      return {
        title: position
          ? `Oxygen sensor fault — ${locus}`
          : 'Oxygen sensor circuit fault',
        meaning:
          `The engine computer has decided that ${fault} on ${where}. ` +
          (upstream
            ? 'This sensor sits before the catalytic converter and tells the engine how rich or ' +
              'lean the mixture is, so the computer relies on it to set fuelling.'
            : 'This sensor sits after the catalytic converter and is used to grade how well the ' +
              'converter is working, not to set fuelling.'),
        severity: heater ? 'minor' : upstream ? 'moderate' : 'minor',
        drive: 'drive-with-care',
        driveNote: upstream
          ? 'The engine falls back to a default fuelling map, so it will run — just less ' +
            'efficiently, and long-term it can foul the catalytic converter.'
          : 'Fuelling is unaffected. The car will fail an emissions test until it is fixed.',
        symptoms: [
          'Check engine light on',
          'Worse fuel economy',
          upstream ? 'Rough or uneven running, especially when warm' : 'No change you can feel',
          'Fails an emissions test',
        ],
        causes: [
          { text: 'The oxygen sensor itself has aged or failed', likelihood: 'common' },
          heater
            ? { text: 'Blown fuse on the sensor heater circuit', likelihood: 'common' as const }
            : { text: 'Exhaust leak upstream of the sensor', likelihood: 'common' as const },
          { text: 'Damaged or corroded sensor wiring or connector', likelihood: 'possible' },
          { text: 'Fuelling problem elsewhere that the sensor is correctly reporting', likelihood: 'possible' },
        ],
        fixes: [
          { text: 'Inspect the sensor connector and its wiring for heat damage', where: 'diy-easy' },
          { text: 'Check for exhaust leaks before the sensor', where: 'diy-moderate' },
          { text: `Replace the sensor at ${where}`, where: 'diy-moderate' },
        ],
        related: ['P0420', 'P0171'],
        system: 'emissions',
        locus,
      };
    },
  },

  // ─── Lost communication, U01xx ───────────────────────────────────────────
  {
    id: 'lost-communication',
    letter: 'U',
    from: 0x0100,
    to: 0x01ff,
    build: (code) => {
      const name = moduleName(code.raw);
      const safety = isSafetyModule(code.raw);
      return {
        title: `Lost communication with ${name}`,
        meaning:
          `Modern cars are a network of small computers that talk to each other over a shared ` +
          `two-wire bus. This code means the reporting module stopped hearing from ${name}. ` +
          'Either that module is dead, unpowered, or the wiring between them is broken.',
        severity: safety ? 'serious' : 'moderate',
        drive: safety ? 'drive-with-care' : 'drive-with-care',
        driveNote: safety
          ? 'A safety system is offline. The car still drives, but do not rely on it behaving ' +
            'normally in an emergency.'
          : 'The car usually drives normally, though whatever that module controls may not work.',
        symptoms: [
          'Warning lights on the dashboard, often several at once',
          'A feature that simply stops working',
          'Other modules reporting their own communication codes',
        ],
        causes: [
          { text: 'Blown fuse or lost power feed to the module', likelihood: 'common' },
          { text: 'Corroded or damaged connector at the module', likelihood: 'common' },
          { text: 'Broken or shorted wiring in the network bus', likelihood: 'possible' },
          { text: 'The module itself has failed', likelihood: 'possible' },
          { text: 'Weak battery or a recent jump-start upsetting the whole network', likelihood: 'possible' },
        ],
        fixes: [
          { text: 'Check the battery voltage and charge it fully before anything else', where: 'diy-easy' },
          { text: 'Check the fuses that feed the module', where: 'diy-easy' },
          { text: 'Inspect the module connector for corrosion or water damage', where: 'diy-moderate' },
          { text: 'Have the network bus tested for resistance and shorts', where: 'shop' },
        ],
        related: [],
        system: 'network',
        locus: null,
      };
    },
  },

  // ─── Invalid data received, U04xx ────────────────────────────────────────
  {
    id: 'invalid-data',
    letter: 'U',
    from: 0x0400,
    to: 0x04ff,
    // No module name here on purpose: the invalid-data range is numbered
    // differently from the lost-communication range (U0121 is the ABS module,
    // but its invalid-data twin is U0415, not U0422), so naming one from the
    // other would be confidently wrong. The SAE title is substituted in by the
    // resolver wherever the catalog has it.
    build: () => {
      return {
        title: 'Invalid data received from another control module',
        meaning:
          'One of the car’s control modules is still talking, but the numbers it is sending do ' +
          'not make sense to the module receiving them. That usually points at a sensor feeding ' +
          'it bad readings rather than at the network wiring itself.',
        severity: 'moderate',
        drive: 'drive-with-care',
        driveNote:
          'The car drives, but whichever system depends on those readings may behave oddly ' +
          'or shut itself down.',
        symptoms: [
          'Warning lights on the dashboard',
          'A system that works intermittently',
          'Other modules reporting related faults',
        ],
        causes: [
          { text: 'A sensor feeding that module is out of range or failing', likelihood: 'common' },
          { text: 'The module has a stored fault of its own — read its codes first', likelihood: 'common' },
          { text: 'Software mismatch after a module was replaced or reprogrammed', likelihood: 'possible' },
        ],
        fixes: [
          { text: 'Read the codes stored in that module directly, not just the engine codes', where: 'shop' },
          { text: 'Fix the underlying sensor fault, then clear and re-check', where: 'shop' },
        ],
        related: [],
        system: 'network',
        locus: null,
      };
    },
  },
];

/**
 * Narrowest matching range wins, so a precise rule can sit inside a coarse one
 * without the table needing to be kept in any particular order.
 */
export function findRule(code: ParsedCode): DeriveRule | null {
  let best: DeriveRule | null = null;
  let bestSpan = Number.POSITIVE_INFINITY;

  for (const rule of RULES) {
    if (rule.letter !== code.letter) continue;
    if (code.numeric < rule.from || code.numeric > rule.to) continue;
    const span = rule.to - rule.from;
    if (span < bestSpan) {
      best = rule;
      bestSpan = span;
    }
  }

  return best;
}

export { RULES };
