import type { AuthoredDtc } from '../types';

/** P0100–P019F: how much air is coming in and how much fuel is going with it. */
export const FUEL_AIR: Record<string, AuthoredDtc> = {
  P0101: {
    title: 'Air flow sensor reading out of range',
    meaning:
      'The mass air flow sensor measures how much air the engine is breathing, and the engine ' +
      'computer uses that to decide how much fuel to inject. The sensor is still reporting, but ' +
      'its numbers do not match what the throttle position and engine speed say they should be.',
    severity: 'moderate',
    drive: 'drive-with-care',
    driveNote:
      'The engine falls back to an estimate, so it runs — just roughly and thirstily. Fix it ' +
      'before it starts fouling the catalytic converter.',
    symptoms: [
      'Hesitation or a flat spot when accelerating',
      'Rough or hunting idle',
      'Noticeably worse fuel economy',
      'Occasional stalling just after start-up',
    ],
    causes: [
      { text: 'Air flow sensor element dirty — very often from an over-oiled air filter', likelihood: 'common' },
      { text: 'Air leak in the intake pipe between the sensor and the throttle', likelihood: 'common' },
      { text: 'Blocked or collapsed air filter', likelihood: 'possible' },
      { text: 'The sensor itself has drifted out of calibration', likelihood: 'possible' },
      { text: 'Exhaust restriction upsetting the air the engine can pull', likelihood: 'rare' },
    ],
    fixes: [
      { text: 'Clean the sensor element with dedicated air flow sensor cleaner — never brake cleaner', where: 'diy-easy' },
      { text: 'Check the air filter and replace it if dirty', where: 'diy-easy' },
      { text: 'Check the intake ducting for splits, loose clamps or a disconnected breather', where: 'diy-easy' },
      { text: 'Compare live air flow readings against the expected grams per second at idle', where: 'diy-moderate' },
      { text: 'Replace the air flow sensor', where: 'diy-moderate' },
    ],
    related: ['P0100', 'P0102', 'P0103', 'P0171'],
    system: 'fuel-air',
  },
  P0102: {
    title: 'Air flow sensor reading too low',
    meaning:
      'The mass air flow sensor is reporting less air than the engine could possibly be running ' +
      'on. Either the sensor has failed, its wiring is broken, or the air is getting in past it.',
    severity: 'moderate',
    drive: 'drive-with-care',
    driveNote: 'The engine will run on a fallback estimate, poorly but safely, for a short trip.',
    symptoms: ['Hard starting', 'Rough idle and stalling', 'Very poor throttle response', 'Black smoke or a rich smell'],
    causes: [
      { text: 'Air flow sensor element contaminated or failed', likelihood: 'common' },
      { text: 'Broken, shorted or unplugged sensor wiring', likelihood: 'common' },
      { text: 'Severely blocked air filter', likelihood: 'possible' },
      { text: 'Intake leak after the sensor letting unmeasured air in', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Check the sensor is plugged in and the connector is dry and clean', where: 'diy-easy' },
      { text: 'Clean the sensor element and replace the air filter', where: 'diy-easy' },
      { text: 'Check the intake ducting for splits between the sensor and the engine', where: 'diy-easy' },
      { text: 'Replace the air flow sensor', where: 'diy-moderate' },
    ],
    related: ['P0101', 'P0103'],
    system: 'fuel-air',
  },
  P0106: {
    title: 'Manifold pressure sensor reading out of range',
    meaning:
      'The manifold absolute pressure sensor measures the vacuum inside the intake, which tells ' +
      'the engine computer how hard the engine is working. Its reading no longer agrees with ' +
      'engine speed and throttle position.',
    severity: 'moderate',
    drive: 'drive-with-care',
    driveNote: 'Fuelling is being estimated, so expect roughness and worse economy until it is fixed.',
    symptoms: ['Rough idle', 'Poor acceleration', 'Worse fuel economy', 'Check engine light on'],
    causes: [
      { text: 'Vacuum leak — a split hose, a perished gasket or a loose oil cap', likelihood: 'common' },
      { text: 'Blocked or split vacuum line to the sensor', likelihood: 'common' },
      { text: 'Sensor contaminated with oil or carbon', likelihood: 'possible' },
      { text: 'Sensor has failed', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Check every vacuum hose for splits and loose connections', where: 'diy-easy' },
      { text: 'Remove and clean the sensor port', where: 'diy-easy' },
      { text: 'Have a smoke test done to find hidden intake leaks', where: 'shop' },
      { text: 'Replace the manifold pressure sensor', where: 'diy-moderate' },
    ],
    related: ['P0107', 'P0108', 'P0171'],
    system: 'fuel-air',
  },
  P0113: {
    title: 'Intake air temperature sensor reading too high',
    meaning:
      'The intake air temperature sensor tells the engine computer how dense the incoming air ' +
      'is. It is reporting a temperature above anything physically plausible, which almost ' +
      'always means an open circuit rather than genuinely hot air.',
    severity: 'minor',
    drive: 'safe-to-drive',
    driveNote: 'The engine uses a default air temperature and drives close to normally.',
    symptoms: ['Check engine light on', 'Slightly worse fuel economy', 'Occasionally harder cold starting'],
    causes: [
      { text: 'Sensor unplugged or its connector corroded', likelihood: 'common' },
      { text: 'Broken wire in the sensor circuit', likelihood: 'common' },
      { text: 'Sensor has failed open', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Unplug and reseat the sensor connector, checking for green corrosion', where: 'diy-easy' },
      { text: 'Check the wiring back to the engine computer for breaks', where: 'diy-moderate' },
      { text: 'Replace the intake air temperature sensor', where: 'diy-easy' },
    ],
    related: ['P0112', 'P0110'],
    system: 'fuel-air',
  },
  P0117: {
    title: 'Coolant temperature sensor reading too low',
    meaning:
      'The coolant temperature sensor is reporting a temperature colder than the engine could ' +
      'plausibly be. The computer uses this reading to decide how much extra fuel a cold engine ' +
      'needs, so a stuck-cold reading makes it over-fuel permanently.',
    severity: 'moderate',
    drive: 'drive-with-care',
    driveNote:
      'The engine will run rich, which wastes fuel and can wash oil off the bores and foul the ' +
      'catalytic converter over time.',
    symptoms: [
      'Temperature gauge reading low or not moving',
      'Cooling fans running constantly',
      'Strong fuel smell and poor economy',
      'Black smoke from the exhaust',
    ],
    causes: [
      { text: 'Sensor has failed short', likelihood: 'common' },
      { text: 'Wiring shorted to ground, often where it passes near the exhaust', likelihood: 'common' },
      { text: 'Corroded sensor connector', likelihood: 'possible' },
      { text: 'Thermostat stuck open, so the engine genuinely never warms up', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Compare the live coolant reading against the dashboard gauge once warm', where: 'diy-easy' },
      { text: 'Inspect the sensor wiring for melted or chafed insulation', where: 'diy-moderate' },
      { text: 'Replace the coolant temperature sensor', where: 'diy-moderate' },
      { text: 'Check the thermostat if the engine really does run cold', where: 'shop' },
    ],
    related: ['P0116', 'P0118', 'P0128'],
    system: 'fuel-air',
  },
  P0128: {
    title: 'Engine not reaching normal operating temperature',
    meaning:
      'The engine computer times how long the engine takes to warm up and compares it against ' +
      'what the outside temperature says it should be. The engine is warming too slowly, or ' +
      'never quite getting there. Almost always a thermostat stuck part-open.',
    severity: 'minor',
    drive: 'safe-to-drive',
    driveNote:
      'A cold-running engine is not in danger, but it wastes fuel, wears faster and the heater ' +
      'will be weak in winter.',
    symptoms: [
      'Temperature gauge sitting below its usual mark',
      'Cabin heater not getting properly hot',
      'Worse fuel economy',
      'Check engine light on',
    ],
    causes: [
      { text: 'Thermostat stuck open or opening too early', likelihood: 'common' },
      { text: 'Coolant temperature sensor reading low', likelihood: 'possible' },
      { text: 'Cooling fan running when it should not be', likelihood: 'rare' },
    ],
    fixes: [
      { text: 'Watch the live coolant temperature during a warm-up; it should reach 85–100 °C', where: 'diy-easy' },
      { text: 'Replace the thermostat', where: 'diy-moderate' },
      { text: 'Replace the coolant temperature sensor if the gauge and the data disagree', where: 'diy-moderate' },
    ],
    related: ['P0117', 'P0125'],
    system: 'fuel-air',
  },
  P0171: {
    title: 'Fuel mixture too lean, bank 1',
    meaning:
      'The engine computer has been adding extra fuel for some time to keep the mixture right, ' +
      'and it has now run out of adjustment. Either more air is getting in than is being ' +
      'measured, or less fuel is arriving than was asked for. Bank 1 is the side of the engine ' +
      'containing cylinder 1; on a four-cylinder engine that is the whole engine.',
    severity: 'moderate',
    drive: 'drive-with-care',
    driveNote:
      'A lean mixture burns hotter. Short trips are fine, but sustained lean running damages ' +
      'valves and the catalytic converter.',
    symptoms: [
      'Rough or hunting idle',
      'Hesitation when pulling away',
      'Slight loss of power',
      'Sometimes a whistling or hissing noise from the engine bay',
    ],
    causes: [
      { text: 'Vacuum leak — split hose, perished intake gasket, loose oil filler cap', likelihood: 'common' },
      { text: 'Dirty or failing mass air flow sensor under-reading the air', likelihood: 'common' },
      { text: 'Leaking positive crankcase ventilation hose', likelihood: 'common' },
      { text: 'Weak fuel pump or blocked fuel filter', likelihood: 'possible' },
      { text: 'Clogged fuel injectors', likelihood: 'possible' },
      { text: 'Exhaust leak before the oxygen sensor pulling in fresh air', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Check the oil filler cap and dipstick are properly seated — a classic cause', where: 'diy-easy' },
      { text: 'Inspect every vacuum and breather hose for splits', where: 'diy-easy' },
      { text: 'Clean the mass air flow sensor', where: 'diy-easy' },
      { text: 'Watch the short and long term fuel trims on Live data; over +10 % confirms it', where: 'diy-moderate' },
      { text: 'Have a smoke test done to find the leak', where: 'shop' },
      { text: 'Test the fuel pressure against spec', where: 'shop' },
    ],
    related: ['P0174', 'P0101', 'P0300'],
    system: 'fuel-air',
  },
  P0172: {
    title: 'Fuel mixture too rich, bank 1',
    meaning:
      'The engine computer has been cutting fuel to keep the mixture right and has run out of ' +
      'adjustment. Too much fuel is arriving, or too little air is getting in for the amount ' +
      'being injected.',
    severity: 'moderate',
    drive: 'drive-with-care',
    driveNote:
      'Running rich washes oil off the cylinder walls and dumps unburnt fuel into the catalytic ' +
      'converter, which will eventually destroy it.',
    symptoms: [
      'Strong fuel smell, especially at idle',
      'Black smoke from the exhaust',
      'Poor fuel economy',
      'Rough idle and sooty spark plugs',
    ],
    causes: [
      { text: 'Blocked air filter', likelihood: 'common' },
      { text: 'Leaking fuel injector', likelihood: 'common' },
      { text: 'Failing coolant temperature sensor telling the engine it is cold', likelihood: 'possible' },
      { text: 'Fuel pressure regulator stuck high', likelihood: 'possible' },
      { text: 'Mass air flow sensor over-reading', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Replace the air filter', where: 'diy-easy' },
      { text: 'Check the live coolant temperature reaches 85–100 °C when warm', where: 'diy-easy' },
      { text: 'Watch the fuel trims; strongly negative numbers confirm a rich condition', where: 'diy-moderate' },
      { text: 'Have the fuel pressure and injector spray pattern tested', where: 'shop' },
    ],
    related: ['P0175', 'P0117', 'P0132'],
    system: 'fuel-air',
  },
  P0174: {
    title: 'Fuel mixture too lean, bank 2',
    meaning:
      'The same lean condition as P0171, but on bank 2 — the other cylinder head on a V6, V8 or ' +
      'flat engine. Seeing P0171 and P0174 together points at something both banks share, like ' +
      'the air flow sensor or a leak at the throttle body, rather than one bad injector.',
    severity: 'moderate',
    drive: 'drive-with-care',
    driveNote:
      'A lean mixture burns hotter. Short trips are fine, but sustained lean running damages ' +
      'valves and the catalytic converter.',
    symptoms: ['Rough idle', 'Hesitation on acceleration', 'Loss of power', 'Poor fuel economy'],
    causes: [
      { text: 'Vacuum leak somewhere both banks share, such as the intake plenum gasket', likelihood: 'common' },
      { text: 'Dirty or failing mass air flow sensor', likelihood: 'common' },
      { text: 'Leaking positive crankcase ventilation system', likelihood: 'common' },
      { text: 'Weak fuel pump or blocked filter', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Inspect the shared intake ducting and breather hoses first', where: 'diy-easy' },
      { text: 'Clean the mass air flow sensor', where: 'diy-easy' },
      { text: 'Have a smoke test done on the intake', where: 'shop' },
      { text: 'Test the fuel pressure against spec', where: 'shop' },
    ],
    related: ['P0171', 'P0101'],
    system: 'fuel-air',
  },
  P0175: {
    title: 'Fuel mixture too rich, bank 2',
    meaning:
      'The same rich condition as P0172, on the other cylinder bank. Both banks reporting rich ' +
      'together points at something shared — fuel pressure, the air flow sensor, or a coolant ' +
      'temperature sensor stuck cold.',
    severity: 'moderate',
    drive: 'drive-with-care',
    driveNote:
      'Running rich dumps unburnt fuel into the catalytic converter, which will eventually ' +
      'destroy it.',
    symptoms: ['Fuel smell', 'Black smoke', 'Poor economy', 'Rough idle'],
    causes: [
      { text: 'Blocked air filter', likelihood: 'common' },
      { text: 'Fuel pressure regulator stuck high', likelihood: 'common' },
      { text: 'Coolant temperature sensor reading cold', likelihood: 'possible' },
      { text: 'Leaking injectors on that bank', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Replace the air filter', where: 'diy-easy' },
      { text: 'Check the live coolant temperature', where: 'diy-easy' },
      { text: 'Have the fuel pressure tested', where: 'shop' },
    ],
    related: ['P0172', 'P0117'],
    system: 'fuel-air',
  },
};
