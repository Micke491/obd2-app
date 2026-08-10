import type { CatalogEntry } from '../types';

import { CHARGING_RISK, COMFORT_RISK, OIL_RISK } from './risks';

/** P0500–P05FF: road speed, idle control, oil pressure, charging, cruise. */
export const VEHICLE: Record<string, CatalogEntry> = {
  // ── Vehicle speed, P0500–P0504 ──────────────────────────────────────────
  P0500: {
    title: 'Vehicle speed sensor malfunction',
    brief:
      'The engine computer is not receiving a road speed signal. Besides the speedometer, this feeds cruise control, idle control and the transmission’s shift decisions.',
  },
  P0501: {
    title: 'Vehicle speed sensor range/performance',
    brief:
      'A speed signal arrives, but it does not agree with the transmission output speed or the wheel speed sensors. A failing sensor, or a damaged tone ring.',
  },
  P0502: {
    title: 'Vehicle speed sensor circuit low input',
    brief: 'The road speed signal is below its valid range — a short to ground, or a broken signal wire.',
  },
  P0503: {
    title: 'Vehicle speed sensor intermittent or erratic',
    brief:
      'The road speed signal jumps or drops out. Often a sensor connector, or interference picked up from a badly routed wire.',
  },
  P0504: {
    title: 'Brake switch A and B correlation',
    brief:
      'The brake pedal has two switches so each can check the other, and they disagree about whether the pedal is pressed. Usually the switch has slipped in its bracket or one contact has failed.',
  },

  // ── Idle control, P0505–P0511 ───────────────────────────────────────────
  P0505: {
    title: 'Idle control system malfunction',
    brief:
      'The computer cannot hold the idle where it wants it. On an older car this is the idle air valve; on a newer one, the electronic throttle refusing to sit at the right small opening.',
  },
  P0506: {
    title: 'Idle speed lower than expected',
    brief:
      'Idle keeps dropping below target even with the idle control fully open. Carbon in the throttle body, a blocked idle passage, or extra drag from an accessory.',
  },
  P0507: {
    title: 'Idle speed higher than expected',
    brief:
      'Idle sits above target with the idle control closed as far as it goes. Air is getting in somewhere it should not — a vacuum leak, a stuck purge valve, or a throttle plate not closing.',
  },
  P0508: {
    title: 'Idle air control system circuit low',
    brief: 'The idle air control circuit is shorted to ground, so the valve is driven when it should not be.',
  },
  P0509: {
    title: 'Idle air control system circuit high',
    brief: 'The idle air control circuit is open or shorted to voltage, so the valve never moves.',
  },
  P0510: {
    title: 'Closed throttle position switch malfunction',
    brief:
      'The switch that tells the computer your foot is off the throttle is not working, so it cannot tell idle from a light cruise.',
  },
  P0511: {
    title: 'Idle air control circuit malfunction',
    brief:
      'The idle air control valve is not answering electrically — the motor windings inside it, or the wiring to them.',
  },

  // ── Starting and battery, P0512–P0517 ───────────────────────────────────
  P0512: {
    title: 'Starter request circuit malfunction',
    brief:
      'The signal asking the computer to crank the engine is faulty. On a push-button car this can mean it will not start at all.',
  },
  P0513: {
    title: 'Incorrect immobiliser key',
    brief:
      'The key’s transponder answered, but with an identity this car does not accept. A cloned or unprogrammed key, or a reader coil that read it badly.',
  },
  P0514: {
    title: 'Battery temperature sensor range/performance',
    brief:
      'Battery temperature is being reported but does not fit the ambient and engine temperatures. Charging voltage is adjusted from this reading.',
  },
  P0515: {
    title: 'Battery temperature sensor circuit',
    brief: 'The battery temperature sensor is not giving a usable signal, so the charging voltage cannot be trimmed for it.',
  },
  P0516: {
    title: 'Battery temperature sensor circuit low',
    brief: 'The battery temperature signal is below its valid range — a short to ground.',
  },
  P0517: {
    title: 'Battery temperature sensor circuit high',
    brief: 'The battery temperature signal is above its valid range — an open circuit or a disconnected sensor.',
  },

  // ── Oil pressure, P0520–P0524 ───────────────────────────────────────────
  P0520: {
    title: 'Engine oil pressure sensor or switch circuit malfunction',
    brief:
      'The oil pressure sensor is not giving a usable signal, so the computer cannot tell whether the engine has pressure or not.',
    risk: OIL_RISK,
  },
  P0521: {
    title: 'Engine oil pressure sensor or switch range/performance',
    brief:
      'Oil pressure is being reported, but not the value expected for this engine speed and temperature. Either the sensor has drifted or the pressure really is low.',
    risk: OIL_RISK,
  },
  P0522: {
    title: 'Engine oil pressure sensor or switch low voltage',
    brief:
      'The oil pressure signal is at the bottom of its range. That is what a short to ground looks like — and also what genuinely no oil pressure looks like.',
    risk: OIL_RISK,
  },
  P0523: {
    title: 'Engine oil pressure sensor or switch high voltage',
    brief:
      'The oil pressure signal is at the top of its range, above anything the engine could produce. Normally an open circuit or an unplugged sensor.',
    risk: OIL_RISK,
  },
  P0524: {
    title: 'Engine oil pressure too low',
    brief:
      'The computer has decided the engine genuinely has too little oil pressure — not that the sensor is faulty. Low oil level, a worn pump, or a blocked pickup.',
    risk: {
      severity: 'critical',
      drive: 'stop-now',
      note: 'Bearings are destroyed in seconds without oil pressure. Stop, switch off, and check the level before the engine turns again.',
    },
  },

  // ── Cooling fan speed and air conditioning, P0526–P0534 ─────────────────
  P0526: {
    title: 'Cooling fan speed sensor circuit',
    brief:
      'The feedback signal telling the computer how fast the cooling fan is actually turning is missing.',
  },
  P0527: {
    title: 'Cooling fan speed sensor range/performance',
    brief: 'The fan is turning at a speed that does not match what was commanded — a tiring motor, or drag in its bearings.',
  },
  P0528: {
    title: 'Cooling fan speed sensor, no signal',
    brief: 'No fan speed feedback at all while the fan is commanded on, which suggests the fan is not turning.',
  },
  P0529: {
    title: 'Cooling fan speed sensor intermittent',
    brief: 'The fan speed feedback cuts in and out, pointing at a connector or a chafed wire.',
  },
  P0530: {
    title: 'Air conditioning refrigerant pressure sensor circuit malfunction',
    brief:
      'The air conditioning pressure sensor is not reporting, so the system will not engage the compressor — protecting it from running with no gas.',
    risk: COMFORT_RISK,
  },
  P0531: {
    title: 'Air conditioning refrigerant pressure sensor range/performance',
    brief: 'The measured refrigerant pressure does not fit the ambient temperature and compressor state.',
    risk: COMFORT_RISK,
  },
  P0532: {
    title: 'Air conditioning refrigerant pressure sensor circuit low input',
    brief:
      'The refrigerant pressure signal is below its valid range — a short to ground, or a system that has genuinely lost its gas.',
    risk: COMFORT_RISK,
  },
  P0533: {
    title: 'Air conditioning refrigerant pressure sensor circuit high input',
    brief:
      'The refrigerant pressure signal is above its valid range — an open circuit, or a genuine over-pressure from a blocked condenser.',
    risk: COMFORT_RISK,
  },
  P0534: {
    title: 'Air conditioning refrigerant charge loss',
    brief:
      'Pressure has fallen far enough that the system considers itself empty. A leak somewhere — the condenser, a hose, or a compressor shaft seal.',
    risk: COMFORT_RISK,
  },

  // ── Intake air heater and exhaust temperature, P0540–P0549 ─────────────
  P0540: {
    title: 'Intake air heater A circuit',
    brief:
      'The heater that warms intake air on a cold diesel start is not answering. You would notice it only as harder cold starting.',
  },
  P0541: {
    title: 'Intake air heater A circuit low',
    brief:
      'The intake air heater circuit is shorted to ground. It then draws current whether commanded or not, which normally blows the heavy fuse feeding it.',
  },
  P0542: {
    title: 'Intake air heater A circuit high',
    brief: 'The intake air heater circuit is open or shorted to voltage, so it never draws current.',
  },
  P0543: {
    title: 'Intake air heater A circuit open',
    brief: 'The intake air heater circuit is open — a blown fuse, a failed relay, or a burnt-out element.',
  },
  P0544: {
    title: 'Exhaust gas temperature sensor circuit, bank 1 sensor 1',
    brief:
      'The first exhaust temperature sensor on bank 1 is not reporting. Diesels use these to protect the turbo and to run particulate filter regeneration safely.',
  },
  P0545: {
    title: 'Exhaust gas temperature sensor circuit low, bank 1 sensor 1',
    brief:
      'The first bank 1 exhaust temperature signal is below its valid range — a short to ground, or a sensor that has failed short.',
  },
  P0546: {
    title: 'Exhaust gas temperature sensor circuit high, bank 1 sensor 1',
    brief:
      'The first bank 1 exhaust temperature signal is above its valid range — usually an open circuit rather than genuinely dangerous heat.',
  },
  P0547: {
    title: 'Exhaust gas temperature sensor circuit, bank 2 sensor 1',
    brief: 'The first exhaust temperature sensor on bank 2 is not giving a usable signal.',
  },
  P0548: {
    title: 'Exhaust gas temperature sensor circuit low, bank 2 sensor 1',
    brief: 'The bank 2 exhaust temperature signal is below its valid range — a short to ground or a broken sensor.',
  },
  P0549: {
    title: 'Exhaust gas temperature sensor circuit high, bank 2 sensor 1',
    brief: 'The bank 2 exhaust temperature signal is above its valid range, normally an open circuit.',
  },

  // ── Power steering, P0550–P0554 ─────────────────────────────────────────
  P0550: {
    title: 'Power steering pressure sensor circuit malfunction',
    brief:
      'The sensor that tells the engine when the power steering pump is working hard is not reporting, so the idle is no longer raised when you turn the wheel at a standstill.',
  },
  P0551: {
    title: 'Power steering pressure sensor range/performance',
    brief: 'Steering pressure is reported but does not match the steering input — a drifting sensor or a tired pump.',
  },
  P0552: {
    title: 'Power steering pressure sensor circuit low input',
    brief: 'The power steering pressure signal is below its valid range — a short to ground or a lost supply.',
  },
  P0553: {
    title: 'Power steering pressure sensor circuit high input',
    brief: 'The power steering pressure signal is above its valid range — an open circuit or a short to voltage.',
  },
  P0554: {
    title: 'Power steering pressure sensor circuit intermittent',
    brief: 'The power steering pressure signal cuts in and out, pointing at a connector or a chafed wire.',
  },

  // ── Charging system, P0560–P0563 ────────────────────────────────────────
  P0560: {
    title: 'System voltage malfunction',
    brief:
      'The voltage feeding the engine computer is outside what it can work with. A failing alternator, a bad earth strap, or corroded battery terminals.',
    risk: CHARGING_RISK,
  },
  P0561: {
    title: 'System voltage unstable',
    brief:
      'Supply voltage is swinging around rather than sitting steady. A worn alternator regulator, a slipping belt, or a battery with a failing cell.',
    risk: CHARGING_RISK,
  },
  P0562: {
    title: 'System voltage low',
    brief:
      'Supply voltage has stayed below normal with the engine running, which means the alternator is not keeping up with the load.',
    risk: CHARGING_RISK,
  },
  P0563: {
    title: 'System voltage high',
    brief:
      'Supply voltage has risen above normal. The alternator regulator has failed, and sustained over-voltage cooks the battery and the electronics.',
    risk: CHARGING_RISK,
  },

  // ── Cruise control, P0564–P0585 ─────────────────────────────────────────
  P0564: {
    title: 'Cruise control multi-function input A circuit',
    brief:
      'The stalk or steering wheel switch that carries several cruise functions on one wire is not giving a readable signal.',
  },
  P0565: {
    title: 'Cruise control on signal malfunction',
    brief: 'The "on" request from the cruise control switch is not reaching the computer correctly.',
  },
  P0566: {
    title: 'Cruise control off signal malfunction',
    brief: 'The "off" request from the cruise control switch is not being read correctly.',
  },
  P0567: {
    title: 'Cruise control resume signal malfunction',
    brief: 'The "resume" request from the cruise control switch is not being read correctly.',
  },
  P0568: {
    title: 'Cruise control set signal malfunction',
    brief: 'The "set" request from the cruise control switch is not being read correctly.',
  },
  P0569: {
    title: 'Cruise control coast signal malfunction',
    brief: 'The "coast" request from the cruise control switch is not being read correctly.',
  },
  P0570: {
    title: 'Cruise control accelerate signal malfunction',
    brief: 'The "accelerate" request from the cruise control switch is not being read correctly.',
  },
  P0571: {
    title: 'Cruise control or brake switch A circuit malfunction',
    brief:
      'The brake switch that cancels cruise control is faulty. Cruise will refuse to engage, because the car cannot prove it would disengage when you brake.',
  },
  P0572: {
    title: 'Cruise control or brake switch A circuit low',
    brief: 'The brake switch signal is stuck low, which reads as the brake being pressed all the time.',
  },
  P0573: {
    title: 'Cruise control or brake switch A circuit high',
    brief: 'The brake switch signal is stuck high, which reads as the brake never being pressed.',
  },
  P0574: {
    title: 'Cruise control system, vehicle speed too high',
    brief: 'Cruise control was cancelled because road speed went above the limit the system will hold.',
  },
  P0575: {
    title: 'Cruise control input circuit',
    brief: 'A cruise control input the computer relies on is out of range or missing.',
  },
  P0579: {
    title: 'Cruise control multi-function input A range/performance',
    brief:
      'The multi-function cruise switch produces a voltage that does not match any of the buttons it is supposed to encode.',
  },
  P0580: {
    title: 'Cruise control multi-function input A circuit low',
    brief: 'The multi-function cruise switch signal is below its valid range — a short to ground.',
  },
  P0581: {
    title: 'Cruise control multi-function input A circuit high',
    brief: 'The multi-function cruise switch signal is above its valid range — an open circuit.',
  },
  P0585: {
    title: 'Cruise control multi-function input A and B correlation',
    brief: 'The two cruise control switch circuits disagree about which button is being pressed.',
  },

  // ── Map-controlled thermostat, P0597–P0599 ──────────────────────────────
  P0597: {
    title: 'Thermostat heater control circuit open',
    brief:
      'Some thermostats have a small heater that lets the computer open them early. That circuit is open — a broken wire or a failed element.',
  },
  P0598: {
    title: 'Thermostat heater control circuit low',
    brief: 'The thermostat heater circuit is shorted to ground, so it is powered when it should not be.',
  },
  P0599: {
    title: 'Thermostat heater control circuit high',
    brief: 'The thermostat heater circuit is open or shorted to voltage, so it never energises.',
  },
};
