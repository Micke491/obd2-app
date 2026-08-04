import type { AuthoredDtc } from '../types';

/** Throttle, pedal, camshaft timing, EGR and the other everyday sensor codes. */
export const SENSORS: Record<string, AuthoredDtc> = {
  P0121: {
    title: 'Throttle position sensor reading out of range',
    meaning:
      'The throttle position sensor tells the engine computer how far open the throttle is. Its ' +
      'reading no longer lines up with the accelerator pedal or with the air actually flowing ' +
      'in, so the computer cannot trust it.',
    severity: 'serious',
    drive: 'limp-to-shop',
    driveNote:
      'Many cars drop into a reduced-power mode because throttle control is a safety function. ' +
      'Sudden power loss in traffic is the risk here, not engine damage.',
    symptoms: [
      'Sudden loss of power or a limp mode',
      'Idle surging or stalling',
      'Hesitation and flat spots when accelerating',
      'Check engine light on',
    ],
    causes: [
      { text: 'Carbon build-up in the throttle body holding the plate off its stop', likelihood: 'common' },
      { text: 'Worn throttle position sensor track', likelihood: 'common' },
      { text: 'Damaged or corroded wiring at the throttle body', likelihood: 'possible' },
      { text: 'Throttle body motor failing', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Clean the throttle body with throttle cleaner and a soft cloth', where: 'diy-moderate' },
      { text: 'Watch throttle position on Live data while a helper presses the pedal — it should sweep smoothly', where: 'diy-moderate' },
      { text: 'Run the throttle relearn procedure after cleaning', where: 'shop' },
      { text: 'Replace the throttle body', where: 'shop' },
    ],
    related: ['P0122', 'P0123', 'P2135', 'P0505'],
    system: 'fuel-air',
  },
  P0135: {
    title: 'Oxygen sensor heater circuit fault, bank 1 sensor 1',
    meaning:
      'An oxygen sensor only reads accurately once it is hot, so it has a built-in heater to get ' +
      'it there quickly from cold. The computer has found that heater circuit faulty. The sensor ' +
      'itself may be perfectly good once the exhaust warms it.',
    severity: 'minor',
    drive: 'safe-to-drive',
    driveNote:
      'Once the engine is warm the sensor works normally. The cost is worse economy and higher ' +
      'emissions for the first few minutes of every trip.',
    symptoms: [
      'Check engine light on',
      'Slightly worse fuel economy, mostly on short trips',
      'No change in how the car drives',
      'Fails an emissions test',
    ],
    causes: [
      { text: 'Heater element inside the sensor has failed', likelihood: 'common' },
      { text: 'Blown fuse on the heater circuit', likelihood: 'common' },
      { text: 'Corroded connector — this one lives under the car', likelihood: 'common' },
      { text: 'Broken wiring in the harness to the sensor', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Check the fuse that feeds the oxygen sensor heaters', where: 'diy-easy' },
      { text: 'Unplug and inspect the sensor connector for corrosion', where: 'diy-moderate' },
      { text: 'Replace the oxygen sensor', where: 'diy-moderate' },
    ],
    related: ['P0141', 'P0155', 'P0161'],
    system: 'emissions',
  },
  P0403: {
    title: 'Exhaust gas recirculation control circuit fault',
    meaning:
      'This is an electrical fault in the circuit that drives the recirculation valve, rather ' +
      'than a judgement about how much gas is flowing. The computer cannot control the valve at ' +
      'all.',
    severity: 'minor',
    drive: 'safe-to-drive',
    driveNote:
      'The valve fails to a safe position. Emissions rise and the car will not pass a test, but ' +
      'nothing is at risk.',
    symptoms: [
      'Check engine light on',
      'Sometimes rough idle if the valve failed open',
      'Light knocking under load if it failed closed',
      'Fails an emissions test',
    ],
    causes: [
      { text: 'Failed recirculation valve solenoid', likelihood: 'common' },
      { text: 'Damaged or corroded connector at the valve', likelihood: 'common' },
      { text: 'Broken wiring between the valve and the computer', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Inspect the valve connector and wiring', where: 'diy-moderate' },
      { text: 'Measure the solenoid resistance against the workshop spec', where: 'diy-moderate' },
      { text: 'Replace the recirculation valve', where: 'shop' },
    ],
    related: ['P0401', 'P0404', 'P0409'],
    system: 'emissions',
  },
  P0411: {
    title: 'Secondary air injection flow incorrect',
    meaning:
      'On a cold start some cars pump fresh air into the exhaust to help the catalytic converter ' +
      'heat up faster. The computer has run its test and found the flow wrong. It only runs for ' +
      'the first minute or two of a cold start, so it never affects a warm engine.',
    severity: 'minor',
    drive: 'safe-to-drive',
    driveNote:
      'Nothing about the way the car drives changes. It fails an emissions test until fixed.',
    symptoms: [
      'Check engine light on, often only after a cold start',
      'Sometimes a loud whirring for a minute after starting',
      'No change once warm',
    ],
    causes: [
      { text: 'Air pump seized or full of water', likelihood: 'common' },
      { text: 'Check valve blocked with carbon', likelihood: 'common' },
      { text: 'Split or disconnected air hose', likelihood: 'possible' },
      { text: 'Blown pump fuse or failed relay', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Listen for the pump running during a cold start', where: 'diy-easy' },
      { text: 'Check the pump fuse and relay', where: 'diy-easy' },
      { text: 'Inspect the hoses and the check valve for blockage', where: 'diy-moderate' },
      { text: 'Replace the air pump or check valve', where: 'shop' },
    ],
    related: ['P0410', 'P0412', 'P0491'],
    system: 'emissions',
  },
  P0446: {
    title: 'Fuel vapour vent control circuit fault',
    meaning:
      'The vent valve lets fresh air into the charcoal canister so trapped petrol vapour can be ' +
      'drawn out and burnt. The computer has found the circuit that operates it faulty, so it ' +
      'cannot seal the system to test it or open it to purge it.',
    severity: 'minor',
    drive: 'safe-to-drive',
    driveNote:
      'Nothing is at risk. In rare cases a stuck-closed vent can make the tank hiss loudly when ' +
      'you open the filler cap.',
    symptoms: [
      'Check engine light on',
      'Occasionally a whoosh of pressure when opening the fuel cap',
      'Fails an emissions test',
    ],
    causes: [
      { text: 'Vent valve blocked with dust or road debris — it sits under the car', likelihood: 'common' },
      { text: 'Failed vent solenoid', likelihood: 'common' },
      { text: 'Corroded connector or damaged wiring', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Inspect the vent valve and its filter for dirt', where: 'diy-moderate' },
      { text: 'Check the connector for corrosion', where: 'diy-moderate' },
      { text: 'Replace the vent valve', where: 'diy-moderate' },
    ],
    related: ['P0455', 'P0449', 'P0442'],
    system: 'emissions',
  },
  P0456: {
    title: 'Very small leak in the fuel vapour system',
    meaning:
      'The smallest leak the system can detect — smaller than P0442. At this size the fuel cap ' +
      'seal is the overwhelmingly likely culprit, and a cap that is merely a little tired will ' +
      'do it.',
    severity: 'minor',
    drive: 'safe-to-drive',
    driveNote: 'Nothing is at risk. It will fail an emissions test.',
    symptoms: ['Check engine light on', 'No change in driving', 'Fails an emissions test'],
    causes: [
      { text: 'Fuel cap seal hardened with age', likelihood: 'common' },
      { text: 'Fuel cap not clicked fully tight', likelihood: 'common' },
      { text: 'Tiny crack in a vapour hose', likelihood: 'possible' },
      { text: 'Seeping vent or purge valve seal', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Fit a new fuel cap — cheap, and it fixes this most of the time', where: 'diy-easy' },
      { text: 'Clear the code and drive for a few days to see if it returns', where: 'diy-easy' },
      { text: 'Have the system smoke-tested if it comes back', where: 'shop' },
    ],
    related: ['P0442', 'P0455'],
    system: 'emissions',
  },
  P0521: {
    title: 'Oil pressure sensor reading out of range',
    meaning:
      'The oil pressure sensor is reporting a value the computer does not believe. This is a ' +
      'code about the sensor, but it sits next to a genuinely serious possibility, so treat the ' +
      'reading as real until you have proved otherwise.',
    severity: 'serious',
    drive: 'limp-to-shop',
    driveNote:
      'If oil pressure really is low, running the engine destroys the bearings within minutes. ' +
      'Check the oil level now, and if the oil warning light is on as well, stop.',
    symptoms: [
      'Oil pressure warning light, steady or flickering',
      'Sometimes a ticking or knocking from the engine',
      'Gauge reading low or jumping',
      'Often no symptoms at all if it is only the sensor',
    ],
    causes: [
      { text: 'Failed oil pressure sensor', likelihood: 'common' },
      { text: 'Low oil level', likelihood: 'common' },
      { text: 'Oil far past its service interval and too thin', likelihood: 'possible' },
      { text: 'Blocked oil pick-up screen', likelihood: 'possible' },
      { text: 'Worn oil pump or bearings — genuinely low pressure', likelihood: 'rare' },
    ],
    fixes: [
      { text: 'Check the oil level on the dipstick before anything else', where: 'diy-easy' },
      { text: 'Compare the live pressure reading against the dashboard light', where: 'diy-easy' },
      { text: 'Have the pressure measured with a mechanical gauge before replacing anything', where: 'shop' },
      { text: 'Replace the oil pressure sensor once mechanical pressure is confirmed good', where: 'shop' },
    ],
    related: ['P0522', 'P0523'],
    system: 'speed-idle',
  },
  P0606: {
    title: 'Engine control module internal fault',
    meaning:
      'The engine computer runs continuous checks on its own processor and memory, and one of ' +
      'those checks has failed. It is reporting a fault with itself rather than with anything ' +
      'it is connected to.',
    severity: 'serious',
    drive: 'limp-to-shop',
    driveNote:
      'A computer that does not trust itself limits power and can behave unpredictably. Do not ' +
      'plan a long journey on it.',
    symptoms: [
      'Reduced power or a limp mode',
      'Several unrelated codes appearing at once',
      'Hard starting, or intermittently no start',
      'Warning lights that come and go',
    ],
    causes: [
      { text: 'Poor power supply or earth to the computer', likelihood: 'common' },
      { text: 'Low battery voltage or a failing alternator', likelihood: 'common' },
      { text: 'Water ingress into the computer or its connector', likelihood: 'possible' },
      { text: 'Genuine internal failure of the module', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Check the battery voltage and clean the earth straps', where: 'diy-easy' },
      { text: 'Inspect the computer connector for water or corrosion', where: 'diy-moderate' },
      { text: 'Have the module tested and, if needed, replaced and coded', where: 'shop' },
    ],
    related: ['P0601', 'P0603', 'P0562'],
    system: 'computer',
  },
  P0715: {
    title: 'Input shaft speed sensor fault',
    meaning:
      'An automatic gearbox compares the speed going in against the speed coming out to work out ' +
      'which gear it is actually achieving. Without the input speed it cannot verify a shift, so ' +
      'it shifts blind or refuses to shift at all.',
    severity: 'serious',
    drive: 'limp-to-shop',
    driveNote:
      'Most gearboxes drop into a fixed-gear limp mode to protect themselves. Driving hard while ' +
      'it slips generates heat, which is what kills automatics.',
    symptoms: [
      'Stuck in one gear',
      'Harsh or missing shifts',
      'Speedometer or rev counter behaving oddly',
      'Transmission warning light',
    ],
    causes: [
      { text: 'Failed input speed sensor', likelihood: 'common' },
      { text: 'Damaged or oil-soaked sensor wiring', likelihood: 'common' },
      { text: 'Low or contaminated transmission fluid', likelihood: 'possible' },
      { text: 'Internal transmission wear', likelihood: 'rare' },
    ],
    fixes: [
      { text: 'Check the transmission fluid level and colour where possible', where: 'diy-moderate' },
      { text: 'Inspect the sensor connector for oil contamination', where: 'shop' },
      { text: 'Replace the input shaft speed sensor', where: 'shop' },
    ],
    related: ['P0700', 'P0720', 'P0730'],
    system: 'transmission',
  },
  P0730: {
    title: 'Incorrect gear ratio',
    meaning:
      'The gearbox commanded a gear and then measured a ratio between input and output speed ' +
      'that does not match it. Something is slipping, or the shift did not happen.',
    severity: 'serious',
    drive: 'limp-to-shop',
    driveNote:
      'A slipping automatic gearbox is wearing itself out every mile you drive it. Get it looked ' +
      'at before it becomes a rebuild.',
    symptoms: [
      'Engine revs climbing without the car accelerating',
      'Harsh, flared or missing shifts',
      'Stuck in one gear',
      'Burnt smell from the transmission',
    ],
    causes: [
      { text: 'Low or burnt transmission fluid', likelihood: 'common' },
      { text: 'Failing shift solenoid', likelihood: 'common' },
      { text: 'Worn clutch packs inside the gearbox', likelihood: 'possible' },
      { text: 'Blocked valve body passages', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Check the fluid level and colour — healthy fluid is red, not brown', where: 'diy-moderate' },
      { text: 'Have the fluid and filter changed to the correct specification', where: 'shop' },
      { text: 'Have the solenoids and valve body tested', where: 'shop' },
    ],
    related: ['P0700', 'P0715', 'P0740'],
    system: 'transmission',
  },
  P2135: {
    title: 'Throttle position sensors disagree',
    meaning:
      'Electronic throttles carry two sensors that must agree with each other at all times — ' +
      'that redundancy is what makes drive-by-wire safe. They are now reading differently, so ' +
      'the computer cannot tell which one to believe and stops trusting both.',
    severity: 'serious',
    drive: 'limp-to-shop',
    driveNote:
      'The car will hold a reduced-power mode, often barely above idle. That is the safety system ' +
      'working correctly, but it means you can lose power at a junction.',
    symptoms: [
      'Sudden severe loss of power',
      'Engine stuck near idle no matter what the pedal does',
      'Check engine light on',
      'Sometimes clears on a restart, then comes back',
    ],
    causes: [
      { text: 'Failed throttle body sensor track', likelihood: 'common' },
      { text: 'Corroded or damaged throttle body connector', likelihood: 'common' },
      { text: 'Carbon build-up preventing the plate returning fully', likelihood: 'possible' },
      { text: 'Wiring fault between the throttle body and the computer', likelihood: 'possible' },
    ],
    fixes: [
      { text: 'Inspect and reseat the throttle body connector', where: 'diy-easy' },
      { text: 'Clean the throttle body and run the relearn procedure', where: 'diy-moderate' },
      { text: 'Replace the throttle body', where: 'shop' },
    ],
    related: ['P0121', 'P2138', 'P0505'],
    system: 'fuel-air',
  },
  P2138: {
    title: 'Accelerator pedal sensors disagree',
    meaning:
      'The accelerator pedal has two independent sensors for the same safety reason the throttle ' +
      'does. They no longer agree, so the computer cannot be sure what the driver is asking for ' +
      'and defaults to a safe reduced power.',
    severity: 'serious',
    drive: 'limp-to-shop',
    driveNote:
      'Expect the car to refuse to rev. That is deliberate — a throttle system that guesses is ' +
      'far more dangerous than one that gives up.',
    symptoms: [
      'Severe loss of power, engine will not rev',
      'Pedal feels dead',
      'Check engine light on',
      'Sometimes normal again after a restart',
    ],
    causes: [
      { text: 'Failed accelerator pedal sensor assembly', likelihood: 'common' },
      { text: 'Damaged or corroded connector at the pedal', likelihood: 'common' },
      { text: 'Water ingress into the footwell wiring', likelihood: 'possible' },
      { text: 'Something jammed under the pedal', likelihood: 'rare' },
    ],
    fixes: [
      { text: 'Check nothing is trapped under the pedal, such as a mat', where: 'diy-easy' },
      { text: 'Unplug and reseat the pedal connector', where: 'diy-easy' },
      { text: 'Watch both pedal sensors on Live data — they should track together', where: 'diy-moderate' },
      { text: 'Replace the accelerator pedal assembly', where: 'diy-moderate' },
    ],
    related: ['P2135', 'P0121'],
    system: 'fuel-air',
  },
};
