import type { AuthoredDtc } from '../types';

/** P0300–P039F: spark, misfire detection and the crank/cam position sensors. */
export const IGNITION: Record<string, AuthoredDtc> = {
  P0300: {
    title: 'Random or multiple cylinder misfire',
    meaning:
      'More than one cylinder is misfiring, or the misfires are moving around rather than ' +
      'staying on one cylinder. That points away from a single bad plug or coil and towards ' +
      'something the whole engine shares — fuel supply, air leaks, or timing.',
    severity: 'serious',
    drive: 'limp-to-shop',
    driveNote:
      'Unburnt fuel reaching a hot catalytic converter destroys it. If the check engine light ' +
      'is flashing, stop as soon as it is safe — that means the misfire is bad enough to be ' +
      'causing damage right now.',
    symptoms: [
      'The engine shakes badly, worst at idle',
      'Clear loss of power and hesitation',
      'Check engine light on, or flashing under load',
      'Smell of unburnt fuel from the exhaust',
    ],
    causes: [
      { text: 'Spark plugs worn out across the whole engine', likelihood: 'common' },
      { text: 'Vacuum leak on the intake manifold', likelihood: 'common' },
      { text: 'Low fuel pressure — weak pump or blocked filter', likelihood: 'common' },
      { text: 'Failing crankshaft or camshaft position sensor', likelihood: 'possible' },
      { text: 'Bad fuel, or water in the tank', likelihood: 'possible' },
      { text: 'Timing belt or chain slipped a tooth', likelihood: 'rare' },
      { text: 'Low compression across several cylinders', likelihood: 'rare' },
    ],
    fixes: [
      { text: 'Check when the spark plugs were last changed; replace as a set if in doubt', where: 'diy-moderate' },
      { text: 'Inspect vacuum and breather hoses for splits', where: 'diy-easy' },
      { text: 'Read the fuel trims on Live data — large positive numbers point at a lean cause', where: 'diy-moderate' },
      { text: 'Check the Monitors screen for per-cylinder misfire counts', where: 'diy-easy' },
      { text: 'Have the fuel pressure and compression tested', where: 'shop' },
    ],
    related: ['P0301', 'P0171', 'P0420'],
    system: 'ignition',
  },
  P0325: {
    title: 'Knock sensor circuit fault, bank 1',
    meaning:
      'The knock sensor is a microphone bolted to the engine block that listens for the sharp ' +
      'rattle of fuel detonating early. Without it the engine computer cannot safely run ' +
      'advanced ignition timing, so it retards the timing as a precaution.',
    severity: 'moderate',
    drive: 'drive-with-care',
    driveNote:
      'The engine protects itself by pulling ignition timing back, so you lose some power and ' +
      'economy but nothing is at risk.',
    symptoms: [
      'Noticeably less power, especially uphill',
      'Worse fuel economy',
      'Check engine light on',
      'Sometimes a pinking or rattling noise under load',
    ],
    causes: [
      { text: 'Knock sensor has failed', likelihood: 'common' },
      { text: 'Corroded or broken sensor wiring — it lives in a hot, dirty place', likelihood: 'common' },
      { text: 'Sensor loose on the block, so it cannot hear properly', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Inspect the sensor connector and wiring for heat damage', where: 'diy-moderate' },
      { text: 'Check the sensor is torqued down correctly — it must be tight to work', where: 'shop' },
      { text: 'Replace the knock sensor', where: 'shop' },
    ],
    related: ['P0326', 'P0330'],
    system: 'ignition',
  },
  P0335: {
    title: 'Crankshaft position sensor circuit fault',
    meaning:
      'The crankshaft position sensor tells the engine computer exactly where the crankshaft is ' +
      'and how fast it is turning. It is the master timing reference for both spark and ' +
      'injection — without it, the engine cannot be run at all.',
    severity: 'critical',
    drive: 'stop-now',
    driveNote:
      'This sensor commonly fails intermittently when hot, cutting the engine without warning. ' +
      'Stalling in traffic or at a junction is genuinely dangerous.',
    symptoms: [
      'Engine cuts out while driving, then restarts after cooling',
      'Long cranking or a complete no-start',
      'Tachometer dropping to zero while the engine is running',
      'Check engine light on',
    ],
    causes: [
      { text: 'Crankshaft position sensor failed, often only once hot', likelihood: 'common' },
      { text: 'Damaged or oil-soaked sensor wiring', likelihood: 'common' },
      { text: 'Debris or metal filings on the sensor tip', likelihood: 'possible' },
      { text: 'Damaged reluctor ring on the crankshaft', likelihood: 'rare' },
    ],
    fixes: [
      { text: 'Inspect the sensor connector for oil contamination and reseat it', where: 'diy-moderate' },
      { text: 'Replace the crankshaft position sensor', where: 'diy-moderate' },
      { text: 'Have the sensor signal checked on a scope if the fault is intermittent', where: 'shop' },
    ],
    related: ['P0336', 'P0340'],
    system: 'ignition',
  },
  P0340: {
    title: 'Camshaft position sensor circuit fault',
    meaning:
      'The camshaft position sensor tells the engine computer which stroke each cylinder is on, ' +
      'so it can inject and spark at the right moment rather than one revolution out. Many ' +
      'engines will still start without it, using a slower search strategy.',
    severity: 'serious',
    drive: 'limp-to-shop',
    driveNote:
      'The engine may start but run poorly, and on some cars it will not start at all once ' +
      'switched off. Do not go far from help.',
    symptoms: [
      'Long cranking before it fires',
      'Rough running or misfires',
      'Loss of power, sometimes a limp mode',
      'Occasional no-start',
    ],
    causes: [
      { text: 'Camshaft position sensor has failed', likelihood: 'common' },
      { text: 'Damaged wiring or a corroded connector', likelihood: 'common' },
      { text: 'Timing belt or chain has jumped, so cam and crank disagree', likelihood: 'possible' },
      { text: 'Failed variable valve timing actuator', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Inspect the sensor connector and wiring', where: 'diy-moderate' },
      { text: 'Replace the camshaft position sensor', where: 'diy-moderate' },
      { text: 'Have the cam-to-crank timing verified before assuming the sensor', where: 'shop' },
    ],
    related: ['P0335', 'P0016'],
    system: 'ignition',
  },
};
