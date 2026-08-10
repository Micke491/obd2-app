import type { CatalogEntry } from '../types';

/** P0700–P09FF: the automatic transmission, its sensors and its solenoids. */
export const TRANSMISSION: Record<string, CatalogEntry> = {
  // ── Transmission control system, P0700–P0709 ────────────────────────────
  P0700: {
    title: 'Transmission control system malfunction',
    brief:
      'A pointer, not a fault. The transmission module has stored a code of its own and is asking the engine computer to light the warning lamp — the real code has to be read from the transmission module.',
  },
  P0701: {
    title: 'Transmission control system range/performance',
    brief: 'The transmission is behaving outside its expected range without a specific circuit being at fault.',
  },
  P0702: {
    title: 'Transmission control system electrical',
    brief:
      'An electrical fault in the transmission control system — supply, earth, or a shared circuit rather than one solenoid.',
  },
  P0703: {
    title: 'Torque converter or brake switch B circuit malfunction',
    brief:
      'The brake signal the transmission uses to release the torque converter lock-up is faulty. The switch on the pedal is the usual suspect.',
  },
  P0704: {
    title: 'Clutch pedal switch input circuit malfunction',
    brief:
      'The switch that tells the computer the clutch is pressed is not reading correctly, which upsets cruise control and idle control on a manual car.',
  },
  P0705: {
    title: 'Transmission range sensor circuit malfunction',
    brief:
      'The sensor telling the computer which position the selector is in — P, R, N, D — is not giving a usable signal. The car may refuse to start out of Park.',
  },
  P0706: {
    title: 'Transmission range sensor circuit range/performance',
    brief:
      'The selector position signal is readable but does not agree with what the transmission is actually doing. Often a range switch that has drifted out of adjustment.',
  },
  P0707: {
    title: 'Transmission range sensor circuit low input',
    brief: 'The selector position signal is below its valid range — a short to ground or a lost supply.',
  },
  P0708: {
    title: 'Transmission range sensor circuit high input',
    brief: 'The selector position signal is above its valid range — an open circuit or a short to voltage.',
  },
  P0709: {
    title: 'Transmission range sensor circuit intermittent',
    brief:
      'The selector position signal cuts in and out, which can make the transmission shift oddly or drop into limp mode without warning.',
  },

  // ── Fluid temperature and shaft speeds, P0710–P0729 ─────────────────────
  P0710: {
    title: 'Transmission fluid temperature sensor circuit malfunction',
    brief:
      'The fluid temperature sensor is not reporting. Shift pressure and torque converter lock-up are both scheduled from fluid temperature.',
  },
  P0711: {
    title: 'Transmission fluid temperature sensor range/performance',
    brief:
      'Fluid temperature is reported but does not rise and fall as it should — a drifting sensor, or fluid that is not circulating properly.',
  },
  P0712: {
    title: 'Transmission fluid temperature sensor circuit low input',
    brief: 'The fluid temperature signal is at the bottom of its range, normally a short to ground.',
  },
  P0713: {
    title: 'Transmission fluid temperature sensor circuit high input',
    brief: 'The fluid temperature signal is at the top of its range, normally an open circuit.',
  },
  P0714: {
    title: 'Transmission fluid temperature sensor circuit intermittent',
    brief: 'The fluid temperature reading cuts in and out, usually a connector at the transmission case.',
  },
  P0715: {
    title: 'Input or turbine speed sensor circuit malfunction',
    brief:
      'The sensor measuring how fast the transmission input is turning is not reporting. Without it the computer cannot tell whether the clutches are slipping.',
  },
  P0716: {
    title: 'Input or turbine speed sensor range/performance',
    brief:
      'Input speed is reported but does not fit engine speed and gear ratio. A damaged tone ring or a sensor losing its air gap.',
  },
  P0717: {
    title: 'Input or turbine speed sensor circuit, no signal',
    brief:
      'No input speed pulses at all while the transmission is turning. Most cars drop into a fixed-gear limp mode when this happens.',
  },
  P0718: {
    title: 'Input or turbine speed sensor circuit intermittent',
    brief: 'The input speed signal drops out and returns, causing sudden shifts or a transmission that limps and recovers.',
  },
  P0719: {
    title: 'Torque converter or brake switch B circuit low',
    brief: 'The brake signal to the transmission is stuck low, which reads as the brake always being pressed.',
  },
  P0720: {
    title: 'Output speed sensor circuit malfunction',
    brief:
      'The sensor measuring transmission output speed is not reporting. It is also the speedometer source on many cars.',
  },
  P0721: {
    title: 'Output speed sensor circuit range/performance',
    brief:
      'Output speed is reported but does not agree with the wheel speed sensors or the input speed for the gear engaged.',
  },
  P0722: {
    title: 'Output speed sensor circuit, no signal',
    brief: 'No output speed pulses at all while the car is moving — a dead sensor, a broken wire, or a damaged tone ring.',
  },
  P0723: {
    title: 'Output speed sensor circuit intermittent',
    brief: 'The output speed signal cuts in and out, which shows as a speedometer that flicks to zero and back.',
  },
  P0724: {
    title: 'Torque converter or brake switch B circuit high',
    brief: 'The brake signal to the transmission is stuck high, which reads as the brake never being pressed.',
  },
  P0725: {
    title: 'Engine speed input circuit malfunction',
    brief: 'The transmission module is not receiving a usable engine speed signal from the engine computer.',
  },
  P0726: {
    title: 'Engine speed input circuit range/performance',
    brief: 'The engine speed the transmission is being told does not match what it measures at its own input shaft.',
  },
  P0727: {
    title: 'Engine speed input circuit, no signal',
    brief: 'The transmission module receives no engine speed signal at all, so it cannot schedule shifts properly.',
  },
  P0728: {
    title: 'Engine speed input circuit intermittent',
    brief: 'The engine speed signal to the transmission cuts in and out, producing erratic shift behaviour.',
  },
  P0729: {
    title: 'Gear 6 incorrect ratio',
    brief:
      'In sixth gear the input and output speeds do not give the ratio sixth should produce, so something is slipping or the wrong gear is engaged.',
  },

  // ── Gear ratios, P0730–P0736 ────────────────────────────────────────────
  P0730: {
    title: 'Incorrect gear ratio',
    brief:
      'The computer compares input speed against output speed to work out which gear is really engaged, and the answer does not match the gear it commanded. Low fluid, worn clutches, or a stuck solenoid.',
  },
  P0731: {
    title: 'Gear 1 incorrect ratio',
    brief: 'First gear is not producing the ratio it should — slipping clutches, or a shift solenoid not doing its job.',
  },
  P0732: {
    title: 'Gear 2 incorrect ratio',
    brief: 'Second gear is not producing the ratio it should — slipping clutches, or a shift solenoid not doing its job.',
  },
  P0733: {
    title: 'Gear 3 incorrect ratio',
    brief: 'Third gear is not producing the ratio it should — slipping clutches, or a shift solenoid not doing its job.',
  },
  P0734: {
    title: 'Gear 4 incorrect ratio',
    brief: 'Fourth gear is not producing the ratio it should — slipping clutches, or a shift solenoid not doing its job.',
  },
  P0735: {
    title: 'Gear 5 incorrect ratio',
    brief: 'Fifth gear is not producing the ratio it should — slipping clutches, or a shift solenoid not doing its job.',
  },
  P0736: {
    title: 'Reverse incorrect ratio',
    brief: 'Reverse is not producing the ratio it should, which normally shows as poor or absent reverse drive.',
  },

  // ── Torque converter lock-up, P0740–P0744 ───────────────────────────────
  P0740: {
    title: 'Torque converter clutch circuit malfunction',
    brief:
      'The lock-up clutch joins the engine directly to the transmission at cruise, to stop the converter wasting energy as heat. Its control circuit is faulty.',
  },
  P0741: {
    title: 'Torque converter clutch performance or stuck off',
    brief:
      'Lock-up was commanded but the engine speed never dropped the way it should, so the clutch is slipping or not applying. Worn friction material or low line pressure.',
  },
  P0742: {
    title: 'Torque converter clutch stuck on',
    brief:
      'The lock-up clutch will not release. The engine is tied directly to the wheels, so it stalls as you come to a stop — exactly like leaving a manual car in gear.',
  },
  P0743: {
    title: 'Torque converter clutch circuit electrical',
    brief: 'An open or short in the lock-up solenoid circuit — the solenoid coil, its connector, or the harness.',
  },
  P0744: {
    title: 'Torque converter clutch circuit intermittent',
    brief:
      'The lock-up circuit makes and breaks. It feels like a shudder or a lurch at steady motorway speed rather than a clean fault.',
  },

  // ── Pressure control solenoids, P0745–P0749 and P0776–P0798 ────────────
  P0745: {
    title: 'Pressure control solenoid A malfunction',
    brief:
      'The solenoid that sets hydraulic line pressure is faulty. Line pressure decides how firmly every clutch applies, so the whole transmission is affected.',
  },
  P0746: {
    title: 'Pressure control solenoid A performance or stuck off',
    brief:
      'Line pressure stays low regardless of command. Shifts feel soft and slipping, which wears the clutches quickly.',
  },
  P0747: {
    title: 'Pressure control solenoid A stuck on',
    brief: 'Line pressure stays high regardless of command, which makes every shift harsh and jolting.',
  },
  P0748: {
    title: 'Pressure control solenoid A electrical',
    brief: 'An open or short in the line pressure solenoid circuit rather than a hydraulic problem.',
  },
  P0749: {
    title: 'Pressure control solenoid A intermittent',
    brief: 'The line pressure solenoid circuit makes and breaks, so shift quality changes from one moment to the next.',
  },
  P0776: {
    title: 'Pressure control solenoid B performance or stuck off',
    brief: 'The second pressure control solenoid is not raising pressure when commanded, so its clutch slips.',
  },
  P0777: {
    title: 'Pressure control solenoid B stuck on',
    brief: 'The second pressure control solenoid stays applied, holding pressure high and making shifts harsh.',
  },
  P0778: {
    title: 'Pressure control solenoid B electrical',
    brief: 'An open or short in the second pressure control solenoid circuit.',
  },
  P0795: {
    title: 'Pressure control solenoid C malfunction',
    brief: 'The third pressure control solenoid is not doing what it is told.',
  },
  P0796: {
    title: 'Pressure control solenoid C performance or stuck off',
    brief: 'The third pressure control solenoid is not raising pressure when commanded.',
  },
  P0797: {
    title: 'Pressure control solenoid C stuck on',
    brief: 'The third pressure control solenoid stays applied, holding its circuit at pressure.',
  },
  P0798: {
    title: 'Pressure control solenoid C electrical',
    brief: 'An open or short in the third pressure control solenoid circuit.',
  },

  // ── Shift solenoids, P0750–P0774 ────────────────────────────────────────
  P0750: {
    title: 'Shift solenoid A malfunction',
    brief:
      'Shift solenoids are the valves that route fluid to each clutch. The first one is not behaving as commanded.',
  },
  P0751: {
    title: 'Shift solenoid A performance or stuck off',
    brief:
      'Solenoid A responds electrically but the gear change does not follow, so it is stuck closed or its valve is jammed by debris.',
  },
  P0752: {
    title: 'Shift solenoid A stuck on',
    brief: 'Solenoid A is passing fluid when it should not, which usually locks the transmission into one gear.',
  },
  P0753: {
    title: 'Shift solenoid A electrical',
    brief: 'An open or short in shift solenoid A’s circuit — the coil, the connector on the case, or the harness.',
  },
  P0754: {
    title: 'Shift solenoid A intermittent',
    brief: 'Shift solenoid A’s circuit makes and breaks, producing shifts that are sometimes right and sometimes not.',
  },
  P0755: {
    title: 'Shift solenoid B malfunction',
    brief:
      'The second shift solenoid is not behaving as commanded, so the gear changes it controls do not happen cleanly.',
  },
  P0756: {
    title: 'Shift solenoid B performance or stuck off',
    brief: 'Solenoid B answers electrically but the shift it controls does not happen.',
  },
  P0757: {
    title: 'Shift solenoid B stuck on',
    brief: 'Solenoid B passes fluid when it should be closed, so the transmission may hold one gear.',
  },
  P0758: {
    title: 'Shift solenoid B electrical',
    brief:
      'An open or short in shift solenoid B’s circuit — the coil, the connector on the case, or the harness leading to it.',
  },
  P0759: {
    title: 'Shift solenoid B intermittent',
    brief: 'Shift solenoid B’s circuit makes and breaks, giving inconsistent shifts.',
  },
  P0760: {
    title: 'Shift solenoid C malfunction',
    brief:
      'The third shift solenoid is not behaving as commanded, so the gear changes it controls do not happen cleanly.',
  },
  P0761: {
    title: 'Shift solenoid C performance or stuck off',
    brief: 'Solenoid C answers electrically but the shift it controls does not happen.',
  },
  P0762: {
    title: 'Shift solenoid C stuck on',
    brief:
      'Solenoid C passes fluid when it should be closed, which can leave the transmission holding one gear.',
  },
  P0763: {
    title: 'Shift solenoid C electrical',
    brief:
      'An open or short in shift solenoid C’s circuit — the coil, the connector on the case, or the harness leading to it.',
  },
  P0764: {
    title: 'Shift solenoid C intermittent',
    brief: 'Shift solenoid C’s circuit makes and breaks, giving inconsistent shifts.',
  },
  P0765: {
    title: 'Shift solenoid D malfunction',
    brief:
      'The fourth shift solenoid is not behaving as commanded, so the gear changes it controls do not happen cleanly.',
  },
  P0766: {
    title: 'Shift solenoid D performance or stuck off',
    brief: 'Solenoid D answers electrically but the shift it controls does not happen.',
  },
  P0767: {
    title: 'Shift solenoid D stuck on',
    brief:
      'Solenoid D passes fluid when it should be closed, which can leave the transmission holding one gear.',
  },
  P0768: {
    title: 'Shift solenoid D electrical',
    brief:
      'An open or short in shift solenoid D’s circuit — the coil, the connector on the case, or the harness leading to it.',
  },
  P0769: {
    title: 'Shift solenoid D intermittent',
    brief: 'Shift solenoid D’s circuit makes and breaks, giving inconsistent shifts.',
  },
  P0770: {
    title: 'Shift solenoid E malfunction',
    brief:
      'The fifth shift solenoid is not behaving as commanded, so the gear changes it controls do not happen cleanly.',
  },
  P0771: {
    title: 'Shift solenoid E performance or stuck off',
    brief: 'Solenoid E answers electrically but the shift it controls does not happen.',
  },
  P0772: {
    title: 'Shift solenoid E stuck on',
    brief:
      'Solenoid E passes fluid when it should be closed, which can leave the transmission holding one gear.',
  },
  P0773: {
    title: 'Shift solenoid E electrical',
    brief:
      'An open or short in shift solenoid E’s circuit — the coil, the connector on the case, or the harness leading to it.',
  },
  P0774: {
    title: 'Shift solenoid E intermittent',
    brief: 'Shift solenoid E’s circuit makes and breaks, giving inconsistent shifts.',
  },

  // ── Shift quality and intermediate shaft, P0780–P0794 ───────────────────
  P0780: {
    title: 'Shift malfunction',
    brief: 'A commanded gear change did not complete properly, without the computer naming which shift.',
  },
  P0781: {
    title: '1-2 shift malfunction',
    brief: 'The change from first to second did not happen as commanded — a solenoid, or the clutch pack for that shift.',
  },
  P0782: {
    title: '2-3 shift malfunction',
    brief: 'The change from second to third did not happen as commanded.',
  },
  P0783: {
    title: '3-4 shift malfunction',
    brief: 'The change from third to fourth did not happen as commanded.',
  },
  P0784: {
    title: '4-5 shift malfunction',
    brief: 'The change from fourth to fifth did not happen as commanded.',
  },
  P0791: {
    title: 'Intermediate shaft speed sensor circuit',
    brief:
      'The sensor on the intermediate shaft, used to check ratios inside the gearbox, is not giving a usable signal.',
  },
  P0792: {
    title: 'Intermediate shaft speed sensor range/performance',
    brief: 'Intermediate shaft speed is reported but does not fit the input and output speeds.',
  },
  P0793: {
    title: 'Intermediate shaft speed sensor, no signal',
    brief: 'No pulses from the intermediate shaft sensor while the transmission is turning.',
  },
  P0794: {
    title: 'Intermediate shaft speed sensor intermittent',
    brief: 'The intermediate shaft speed signal cuts in and out, pointing at a connector or a chafed wire.',
  },

  // ── Clutch, selector and fluid pressure, P0805–P0883 ───────────────────
  P0805: {
    title: 'Clutch position sensor circuit',
    brief:
      'The sensor measuring clutch pedal or clutch actuator position is not reporting. Automated manual gearboxes depend on it to shift at all.',
  },
  P0806: {
    title: 'Clutch position sensor circuit range/performance',
    brief: 'Clutch position is reported but does not match how the clutch is actually behaving — often a lost adaptation.',
  },
  P0807: {
    title: 'Clutch position sensor circuit low',
    brief: 'The clutch position signal is below its valid range — a short to ground or a lost supply.',
  },
  P0808: {
    title: 'Clutch position sensor circuit high',
    brief: 'The clutch position signal is above its valid range — an open circuit or a short to voltage.',
  },
  P0810: {
    title: 'Clutch position control error',
    brief:
      'The clutch did not reach the position it was commanded to. A worn clutch, a tired actuator, or adaptations that need resetting.',
  },
  P0812: {
    title: 'Reverse input circuit',
    brief: 'The signal telling the computer reverse has been selected is faulty, which can stop the reversing lights or camera working.',
  },
  P0815: {
    title: 'Upshift switch circuit',
    brief: 'The manual upshift paddle or lever switch is not being read correctly.',
  },
  P0816: {
    title: 'Downshift switch circuit',
    brief: 'The manual downshift paddle or lever switch is not being read correctly.',
  },
  P0820: {
    title: 'Gear lever position sensor circuit',
    brief:
      'The sensor reading the gear lever’s position across the gate is not reporting, so the computer cannot tell which gear you have asked for.',
  },
  P0850: {
    title: 'Park or neutral switch input circuit',
    brief:
      'The switch that proves the car is in Park or Neutral is faulty. It is a safety interlock, so the engine may refuse to crank.',
  },
  P0851: {
    title: 'Park or neutral switch input circuit low',
    brief: 'The park/neutral signal is stuck low — a short to ground or a switch stuck closed.',
  },
  P0852: {
    title: 'Park or neutral switch input circuit high',
    brief: 'The park/neutral signal is stuck high — an open circuit or a switch stuck open.',
  },
  P0868: {
    title: 'Transmission fluid pressure low',
    brief:
      'Measured line pressure is below what the transmission needs. Low fluid, a worn pump, or internal leakage past a seal.',
    risk: {
      severity: 'serious',
      drive: 'limp-to-shop',
      note: 'Clutches slipping without enough pressure burn out in a few miles. Check the fluid level and keep the journey short.',
    },
  },
  P0869: {
    title: 'Transmission fluid pressure high',
    brief:
      'Line pressure is above target, which makes shifts harsh and loads the internals. A stuck pressure control solenoid or a jammed regulator valve.',
  },
  P0882: {
    title: 'Transmission control module power input signal low',
    brief:
      'The transmission module’s supply voltage is too low. Check the battery, the earths and the module’s fuse before anything internal.',
  },
  P0883: {
    title: 'Transmission control module power input signal high',
    brief: 'The transmission module’s supply voltage is above normal, which points at the charging system.',
  },
};
