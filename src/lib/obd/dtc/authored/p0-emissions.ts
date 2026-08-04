import type { AuthoredDtc } from '../types';

/** P0400–P04FF: catalyst, EGR, evaporative emissions and secondary air. */
export const EMISSIONS: Record<string, AuthoredDtc> = {
  P0401: {
    title: 'Exhaust gas recirculation flow insufficient',
    meaning:
      'The exhaust gas recirculation valve deliberately lets a little inert exhaust back into ' +
      'the intake. That cools the burn and cuts nitrogen oxide emissions. The engine computer ' +
      'has asked for flow and not seen the intake pressure change as expected.',
    severity: 'minor',
    drive: 'safe-to-drive',
    driveNote:
      'The car drives normally and nothing is at risk, but it will fail an emissions test and ' +
      'may pink slightly under load.',
    symptoms: [
      'Check engine light on',
      'Often no change you can feel',
      'Sometimes a light knock or pinking when accelerating',
      'Fails an emissions test',
    ],
    causes: [
      { text: 'Carbon blocking the recirculation passages — very common on diesels', likelihood: 'common' },
      { text: 'Recirculation valve stuck closed with soot', likelihood: 'common' },
      { text: 'Split or disconnected vacuum hose to the valve', likelihood: 'possible' },
      { text: 'Failed differential pressure sensor', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Remove and clean the recirculation valve and its ports', where: 'diy-moderate' },
      { text: 'Check the vacuum hose or electrical connector at the valve', where: 'diy-easy' },
      { text: 'Clear the recirculation passages in the intake manifold', where: 'shop' },
      { text: 'Replace the valve if cleaning does not free it', where: 'shop' },
    ],
    related: ['P0402', 'P0404', 'P0409'],
    system: 'emissions',
  },
  P0420: {
    title: 'Catalytic converter below efficiency threshold, bank 1',
    meaning:
      'The engine computer compares the oxygen sensor before the catalytic converter with the ' +
      'one after it. A healthy converter smooths the signal out; this one is not, so the ' +
      'computer has concluded it is no longer cleaning the exhaust properly. Importantly, this ' +
      'is a verdict on the converter, and a failing sensor or an untreated misfire can produce ' +
      'the same verdict.',
    severity: 'moderate',
    drive: 'safe-to-drive',
    driveNote:
      'The car drives normally. It will fail an emissions test, and the underlying cause — ' +
      'if it is a misfire or a rich mixture — is worth finding before buying a converter.',
    symptoms: [
      'Check engine light on',
      'No change in how the car drives',
      'Fails an emissions test',
      'Occasionally a sulphur or rotten-egg smell',
    ],
    causes: [
      { text: 'Catalytic converter genuinely worn out — usual above 150,000 km', likelihood: 'common' },
      { text: 'Downstream oxygen sensor lazy or failed, giving a false verdict', likelihood: 'common' },
      { text: 'Exhaust leak before or between the sensors', likelihood: 'common' },
      { text: 'An untreated misfire or rich mixture that poisoned the converter', likelihood: 'possible' },
      { text: 'Engine burning oil or coolant, coating the converter', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Fix any misfire or fuel trim code first — replacing a converter without doing so wastes it', where: 'diy-moderate' },
      { text: 'Check the exhaust for leaks between the manifold and the rear sensor', where: 'diy-moderate' },
      { text: 'Compare the two oxygen sensor traces on Live data; the rear should be nearly flat', where: 'diy-moderate' },
      { text: 'Replace the downstream oxygen sensor if it is slow to respond', where: 'diy-moderate' },
      { text: 'Replace the catalytic converter', where: 'shop' },
    ],
    related: ['P0430', 'P0171', 'P0300', 'P0136'],
    system: 'emissions',
  },
  P0430: {
    title: 'Catalytic converter below efficiency threshold, bank 2',
    meaning:
      'The same verdict as P0420, but for the converter on the other cylinder bank. Only ' +
      'engines with two cylinder heads — V6, V8, flat — have a bank 2.',
    severity: 'moderate',
    drive: 'safe-to-drive',
    driveNote:
      'The car drives normally and will fail an emissions test. Find the underlying cause ' +
      'before replacing the converter.',
    symptoms: ['Check engine light on', 'No change in driving', 'Fails an emissions test'],
    causes: [
      { text: 'Catalytic converter on bank 2 worn out', likelihood: 'common' },
      { text: 'Downstream oxygen sensor on bank 2 lazy or failed', likelihood: 'common' },
      { text: 'Exhaust leak on that bank', likelihood: 'common' },
      { text: 'Untreated misfire or rich running on that bank', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Fix any misfire or fuel trim codes on bank 2 first', where: 'diy-moderate' },
      { text: 'Check that bank of the exhaust for leaks', where: 'diy-moderate' },
      { text: 'Replace the downstream oxygen sensor if it responds slowly', where: 'diy-moderate' },
      { text: 'Replace the catalytic converter', where: 'shop' },
    ],
    related: ['P0420', 'P0174'],
    system: 'emissions',
  },
  P0440: {
    title: 'Fuel vapour system fault',
    meaning:
      'The evaporative emissions system catches petrol vapour from the tank in a charcoal ' +
      'canister and feeds it into the engine to be burnt rather than letting it escape. The ' +
      'computer has tested the system for leaks and it did not hold.',
    severity: 'minor',
    drive: 'safe-to-drive',
    driveNote:
      'This is a fuel-vapour leak. It fails an emissions test but affects nothing you can feel.',
    symptoms: [
      'Check engine light on',
      'Occasionally a faint fuel smell near the rear of the car',
      'No change in how the car drives',
      'Fails an emissions test',
    ],
    causes: [
      { text: 'Fuel cap loose, cross-threaded, or its seal perished', likelihood: 'common' },
      { text: 'Cracked or disconnected vapour hose', likelihood: 'common' },
      { text: 'Purge or vent valve stuck', likelihood: 'possible' },
      { text: 'Charcoal canister cracked', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Remove the fuel cap, check the seal, and refit it until it clicks', where: 'diy-easy' },
      { text: 'Clear the code and drive a few days to see if it returns', where: 'diy-easy' },
      { text: 'Inspect the vapour hoses along the underside of the car', where: 'diy-moderate' },
      { text: 'Have the system smoke-tested to find the leak', where: 'shop' },
    ],
    related: ['P0442', 'P0455', 'P0456'],
    system: 'emissions',
  },
  P0442: {
    title: 'Small leak in the fuel vapour system',
    meaning:
      'The evaporative system was pressure-tested and lost pressure slowly — a small leak, ' +
      'roughly the size of a pinhole. The single most common cause is a fuel cap that was not ' +
      'tightened until it clicked.',
    severity: 'minor',
    drive: 'safe-to-drive',
    driveNote:
      'Nothing about the car is at risk. It will fail an emissions test until it is fixed.',
    symptoms: ['Check engine light on', 'No change in how the car drives', 'Fails an emissions test'],
    causes: [
      { text: 'Fuel cap not tightened, or its rubber seal hardened with age', likelihood: 'common' },
      { text: 'Small crack in a vapour hose', likelihood: 'common' },
      { text: 'Leaking vent or purge valve seal', likelihood: 'possible' },
      { text: 'Pinhole in the charcoal canister', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Refit the fuel cap firmly until it clicks, then clear the code', where: 'diy-easy' },
      { text: 'Replace the fuel cap — they are cheap and a common culprit', where: 'diy-easy' },
      { text: 'Inspect the vapour hoses for cracks, especially where they bend', where: 'diy-moderate' },
      { text: 'Have the system smoke-tested', where: 'shop' },
    ],
    related: ['P0455', 'P0456', 'P0440'],
    system: 'emissions',
  },
  P0455: {
    title: 'Large leak in the fuel vapour system',
    meaning:
      'The evaporative system failed its pressure test badly — it barely held pressure at all. ' +
      'A missing or completely loose fuel cap is the usual explanation, followed by a hose that ' +
      'has come off entirely.',
    severity: 'minor',
    drive: 'safe-to-drive',
    driveNote:
      'Nothing is at risk mechanically, though you may smell petrol. Check the fuel cap is on ' +
      'before anything else.',
    symptoms: [
      'Check engine light on',
      'Fuel smell, particularly after filling up',
      'Fails an emissions test',
    ],
    causes: [
      { text: 'Fuel cap missing, loose or the wrong type', likelihood: 'common' },
      { text: 'Vapour hose disconnected or split open', likelihood: 'common' },
      { text: 'Vent valve stuck open', likelihood: 'possible' },
      { text: 'Damaged charcoal canister, often from a kerb strike', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Check the fuel cap is present and tight, then clear the code', where: 'diy-easy' },
      { text: 'Trace the vapour hoses from the tank forwards, looking for a detached one', where: 'diy-moderate' },
      { text: 'Have the system smoke-tested', where: 'shop' },
    ],
    related: ['P0442', 'P0456', 'P0440'],
    system: 'emissions',
  },
};
