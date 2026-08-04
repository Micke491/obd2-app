import type { AuthoredDtc } from '../types';

/** Turbocharging, fuel pressure and diesel after-treatment. */
export const BOOST_DIESEL: Record<string, AuthoredDtc> = {
  P0087: {
    title: 'Fuel rail pressure too low',
    meaning:
      'A modern engine holds fuel at very high pressure in a rail before injecting it. The ' +
      'pressure sensor is reporting less than the computer asked for, so either not enough fuel ' +
      'is being pumped in or it is leaking back out.',
    severity: 'serious',
    drive: 'limp-to-shop',
    driveNote:
      'Most cars cut power to protect the engine. Running a high-pressure pump dry damages it, ' +
      'and on a common-rail diesel that is an expensive repair.',
    symptoms: [
      'Loss of power, often a hard limp mode',
      'Hesitation or cutting out under acceleration',
      'Hard starting, or a long crank',
      'Rough running at high load',
    ],
    causes: [
      { text: 'Blocked fuel filter — always check this first', likelihood: 'common' },
      { text: 'Weak or worn high-pressure fuel pump', likelihood: 'common' },
      { text: 'Leaking injector returning too much fuel to the tank', likelihood: 'common' },
      { text: 'Failed pressure regulator or metering valve', likelihood: 'possible' },
      { text: 'Air leak on the low-pressure supply side', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Replace the fuel filter and see whether the fault clears', where: 'diy-moderate' },
      { text: 'Check for air bubbles in the clear supply line while cranking', where: 'diy-moderate' },
      { text: 'Have an injector back-leak test done', where: 'shop' },
      { text: 'Have the rail pressure measured against the commanded value', where: 'shop' },
    ],
    related: ['P0088', 'P0093', 'P0191'],
    system: 'fuel-air',
  },
  P0093: {
    title: 'Large fuel leak detected',
    meaning:
      'The engine computer has watched the fuel rail lose pressure faster than it can be ' +
      'accounted for. Somewhere between the pump and the injectors, fuel is escaping.',
    severity: 'critical',
    drive: 'stop-now',
    driveNote:
      'Diesel fuel at rail pressure can atomise and ignite on a hot turbo or exhaust. Stop as ' +
      'soon as it is safe and look for wetness or a fuel smell before restarting.',
    symptoms: [
      'Strong fuel smell',
      'Visible wetness around the injectors or fuel lines',
      'Loss of power and hard starting',
      'Fuel gauge dropping faster than usual',
    ],
    causes: [
      { text: 'Cracked or loose high-pressure fuel line', likelihood: 'common' },
      { text: 'Leaking injector seal or return pipe', likelihood: 'common' },
      { text: 'Failed pressure regulator seal', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Stop and look for wet fuel around the engine — do not keep driving', where: 'diy-easy' },
      { text: 'Have the high-pressure circuit pressure-tested', where: 'shop' },
    ],
    related: ['P0087', 'P0088'],
    system: 'fuel-air',
  },
  P0234: {
    title: 'Turbocharger overboost',
    meaning:
      'The turbocharger is forcing in more air than the engine computer asked for. Boost control ' +
      'works by bleeding exhaust past the turbine or changing the vane angle, so overboost means ' +
      'that control has stopped working, usually stuck shut.',
    severity: 'serious',
    drive: 'limp-to-shop',
    driveNote:
      'Too much boost raises cylinder pressure beyond what the engine was designed for. Most ' +
      'cars cut power to protect it; do not defeat that by driving hard.',
    symptoms: [
      'Sudden power cut after hard acceleration',
      'Limp mode at higher revs',
      'Whistling or fluttering from the turbo',
      'Check engine light on',
    ],
    causes: [
      { text: 'Wastegate or variable vane mechanism seized with soot', likelihood: 'common' },
      { text: 'Split or disconnected boost control hose', likelihood: 'common' },
      { text: 'Failed boost control solenoid', likelihood: 'possible' },
      { text: 'Faulty boost pressure sensor over-reporting', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Check the boost control hoses for splits and loose connections', where: 'diy-easy' },
      { text: 'Watch the boost reading on Live data against the commanded value', where: 'diy-moderate' },
      { text: 'Have the vane or wastegate actuator freed off or replaced', where: 'shop' },
    ],
    related: ['P0299', 'P0243', 'P2263'],
    system: 'fuel-air',
  },
  P0299: {
    title: 'Turbocharger underboost',
    meaning:
      'The turbocharger is not producing the boost the engine computer asked for. Either it is ' +
      'not spinning up properly, or the air it makes is escaping before it reaches the engine.',
    severity: 'moderate',
    drive: 'drive-with-care',
    driveNote:
      'The car is down on power but not in danger. A boost leak that is left alone tends to get ' +
      'worse, and a failing turbo can eventually shed debris into the engine.',
    symptoms: [
      'Clear loss of power, especially uphill',
      'Slow acceleration with no turbo surge',
      'Sometimes a whistle or hiss under load',
      'Black smoke on a diesel',
    ],
    causes: [
      { text: 'Split intercooler hose or loose clamp — the most common cause by far', likelihood: 'common' },
      { text: 'Variable vane mechanism stuck with soot', likelihood: 'common' },
      { text: 'Leaking or perished boost control hose', likelihood: 'common' },
      { text: 'Blocked air filter or restricted intake', likelihood: 'possible' },
      { text: 'Worn turbocharger', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Check every intercooler hose and clamp for splits and oil', where: 'diy-easy' },
      { text: 'Replace the air filter', where: 'diy-easy' },
      { text: 'Compare actual against commanded boost on Live data', where: 'diy-moderate' },
      { text: 'Have the turbo vanes cleaned or the actuator tested', where: 'shop' },
    ],
    related: ['P0234', 'P0101', 'P2263'],
    system: 'fuel-air',
  },
  P2002: {
    title: 'Particulate filter efficiency below threshold',
    meaning:
      'A diesel particulate filter traps soot and periodically burns it off in a regeneration ' +
      'cycle. The computer has decided this filter is no longer doing its job — usually because ' +
      'it is clogged with ash that regeneration cannot remove, or because regeneration keeps ' +
      'being interrupted.',
    severity: 'moderate',
    drive: 'drive-with-care',
    driveNote:
      'A blocking filter chokes the engine and eventually forces a limp mode. Short urban trips ' +
      'make it worse; a longer run at motorway revs is what lets it regenerate.',
    symptoms: [
      'Loss of power, sometimes limp mode',
      'Filter warning light',
      'Cooling fan running hard after a drive',
      'Fuel economy getting worse',
      'Smell of burning during regeneration',
    ],
    causes: [
      { text: 'Mostly short, cold journeys, so regeneration never completes', likelihood: 'common' },
      { text: 'Filter full of ash at the end of its service life', likelihood: 'common' },
      { text: 'Faulty differential pressure sensor or blocked sensor pipes', likelihood: 'possible' },
      { text: 'An underlying fault — bad injector, EGR, glow plugs — blocking regeneration', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Drive for 20 minutes at steady motorway revs to allow a regeneration', where: 'diy-easy' },
      { text: 'Check the pressure sensor pipes are clear and not cracked', where: 'diy-moderate' },
      { text: 'Fix any other engine codes first — they can block regeneration', where: 'shop' },
      { text: 'Have a forced regeneration run, or the filter cleaned or replaced', where: 'shop' },
    ],
    related: ['P2452', 'P2453', 'P242F'],
    system: 'emissions',
  },
  P242F: {
    title: 'Particulate filter restricted, ash accumulation',
    meaning:
      'Regeneration burns soot away but leaves behind ash from oil additives, and ash cannot be ' +
      'burnt off. The computer has calculated that enough has built up to restrict the filter. ' +
      'This is a service item reaching the end of its life rather than a breakage.',
    severity: 'moderate',
    drive: 'drive-with-care',
    driveNote:
      'The car will keep going but with less power, and it will eventually force a limp mode. ' +
      'Plan the repair rather than waiting for it.',
    symptoms: [
      'Gradual loss of power over months',
      'Regeneration happening more and more often',
      'Filter warning light',
      'Worse fuel economy',
    ],
    causes: [
      { text: 'Normal ash build-up at high mileage', likelihood: 'common' },
      { text: 'Engine burning oil, which accelerates ash build-up', likelihood: 'possible' },
      { text: 'Wrong oil specification used at services', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Have the filter professionally cleaned — often cheaper than replacing', where: 'shop' },
      { text: 'Replace the particulate filter', where: 'shop' },
      { text: 'Use only low-ash oil of the correct specification in future', where: 'diy-easy' },
    ],
    related: ['P2002', 'P2463'],
    system: 'emissions',
  },
  P2463: {
    title: 'Particulate filter soot accumulation',
    meaning:
      'Soot has built up past the level the computer is comfortable with. Unlike ash, soot can ' +
      'be burnt off — so this often means regeneration has been starting and not finishing, ' +
      'typically because journeys end before it can complete.',
    severity: 'moderate',
    drive: 'drive-with-care',
    driveNote:
      'A long steady drive may clear it on its own. Ignoring it leads to a full block and a ' +
      'much bigger bill.',
    symptoms: [
      'Filter warning light',
      'Loss of power',
      'Radiator fan running after switching off',
      'Higher idle speed during regeneration',
    ],
    causes: [
      { text: 'Repeated short journeys that never reach regeneration temperature', likelihood: 'common' },
      { text: 'Regeneration interrupted by switching the engine off part-way', likelihood: 'common' },
      { text: 'Faulty exhaust temperature sensor', likelihood: 'possible' },
      { text: 'EGR valve stuck open, producing extra soot', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Drive 20 minutes at steady motorway revs without stopping', where: 'diy-easy' },
      { text: 'Do not switch off while the fan is running hard after a drive', where: 'diy-easy' },
      { text: 'Have a forced regeneration run if driving does not clear it', where: 'shop' },
    ],
    related: ['P2002', 'P242F', 'P0401'],
    system: 'emissions',
  },
  P2096: {
    title: 'Post-catalyst fuel trim too lean, bank 1',
    meaning:
      'The sensor after the catalytic converter is reporting a leaner mixture than expected, and ' +
      'the computer has run out of adjustment trying to correct it. This is usually an exhaust ' +
      'leak letting fresh air in near the sensor rather than a genuine fuelling problem.',
    severity: 'minor',
    drive: 'safe-to-drive',
    driveNote: 'Nothing is at risk. It will fail an emissions test and slightly hurt economy.',
    symptoms: ['Check engine light on', 'Little or no change in driving', 'Fails an emissions test'],
    causes: [
      { text: 'Exhaust leak between the converter and the rear sensor', likelihood: 'common' },
      { text: 'Rear oxygen sensor aged or contaminated', likelihood: 'common' },
      { text: 'Vacuum leak affecting the whole mixture', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Listen for an exhaust leak around the converter with the engine cold', where: 'diy-easy' },
      { text: 'Check for other lean codes that would explain it', where: 'diy-easy' },
      { text: 'Replace the rear oxygen sensor', where: 'diy-moderate' },
    ],
    related: ['P2097', 'P0171', 'P0420'],
    system: 'emissions',
  },
  P2195: {
    title: 'Oxygen sensor signal stuck lean, bank 1 sensor 1',
    meaning:
      'A healthy upstream oxygen sensor swings rapidly between rich and lean as the computer ' +
      'trims the mixture. This one has parked itself at the lean end and stopped swinging, so ' +
      'the computer can no longer use it.',
    severity: 'moderate',
    drive: 'drive-with-care',
    driveNote:
      'The engine falls back to a default fuelling map. It will run, but a mixture set blind ' +
      'wastes fuel and eventually harms the catalytic converter.',
    symptoms: [
      'Worse fuel economy',
      'Rough running when warm',
      'Check engine light on',
      'Hesitation on acceleration',
    ],
    causes: [
      { text: 'Oxygen sensor aged or contaminated', likelihood: 'common' },
      { text: 'Exhaust leak before the sensor drawing in fresh air', likelihood: 'common' },
      { text: 'Vacuum leak leaning the mixture out for real', likelihood: 'possible' },
      { text: 'Low fuel pressure', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Check the fuel trims on Live data before condemning the sensor', where: 'diy-moderate' },
      { text: 'Check for exhaust leaks ahead of the sensor', where: 'diy-moderate' },
      { text: 'Replace the upstream oxygen sensor', where: 'diy-moderate' },
    ],
    related: ['P0171', 'P2196', 'P0133'],
    system: 'emissions',
  },
};
