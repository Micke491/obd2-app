import type { CatalogEntry } from '../types';

import { FAN_RISK } from './risks';

/** P0400–P04FF: exhaust gas recirculation, catalysts, fuel vapour, fans. */
export const EMISSIONS: Record<string, CatalogEntry> = {
  // ── Exhaust gas recirculation, P0400–P0409 and P0489–P0490 ─────────────
  P0400: {
    title: 'Exhaust gas recirculation flow malfunction',
    brief:
      'The EGR valve feeds a measured amount of exhaust back into the intake to cool combustion. The computer cannot get the flow it asks for, in either direction.',
  },
  P0401: {
    title: 'Exhaust gas recirculation flow insufficient',
    brief:
      'The EGR valve was opened but the expected exhaust flow did not follow. Nearly always carbon blocking the valve or its passage rather than an electrical fault.',
  },
  P0402: {
    title: 'Exhaust gas recirculation flow excessive',
    brief:
      'More exhaust is reaching the intake than was commanded — a valve stuck part-open, or one whose seat is held off by carbon. It shows as a rough or stalling idle.',
  },
  P0403: {
    title: 'Exhaust gas recirculation circuit malfunction',
    brief:
      'The electrical circuit that drives the EGR valve is open or shorted, so the valve cannot be commanded at all.',
  },
  P0404: {
    title: 'Exhaust gas recirculation circuit range/performance',
    brief:
      'The EGR valve moves, but not to where it was told. It is sticking part-way, usually because of carbon on the stem.',
  },
  P0405: {
    title: 'Exhaust gas recirculation sensor A circuit low',
    brief:
      'The sensor reporting EGR valve position reads below its valid range — a short to ground, or a lost supply voltage.',
  },
  P0406: {
    title: 'Exhaust gas recirculation sensor A circuit high',
    brief:
      'The EGR position sensor reads above its valid range — an open circuit or a short to voltage rather than a valve that is genuinely wide open.',
  },
  P0407: {
    title: 'Exhaust gas recirculation sensor B circuit low',
    brief: 'The second EGR position sensor reads below its valid range — a short to ground or a lost supply.',
  },
  P0408: {
    title: 'Exhaust gas recirculation sensor B circuit high',
    brief: 'The second EGR position sensor reads above its valid range — an open circuit or a short to voltage.',
  },
  P0409: {
    title: 'Exhaust gas recirculation sensor A circuit',
    brief: 'The EGR position sensor is not giving a usable signal at all, so valve position cannot be verified.',
  },
  P0489: {
    title: 'Exhaust gas recirculation control circuit low',
    brief: 'The EGR valve control wire is shorted to ground, so the valve is driven when it should not be.',
  },
  P0490: {
    title: 'Exhaust gas recirculation control circuit high',
    brief: 'The EGR valve control circuit is open or shorted to voltage, so the valve never actuates.',
  },

  // ── Secondary air injection, P0410–P0419 and P0491–P0492 ───────────────
  P0410: {
    title: 'Secondary air injection system malfunction',
    brief:
      'The pump that blows fresh air into the exhaust for the first minute after a cold start, to bring the catalyst up to temperature quickly, is not working as expected.',
  },
  P0411: {
    title: 'Secondary air injection incorrect flow detected',
    brief:
      'Air is reaching the exhaust, but too much or too little of it. Usually a seized pump, a blocked pipe, or a check valve carboned shut.',
  },
  P0412: {
    title: 'Secondary air injection switching valve A circuit malfunction',
    brief: 'The valve that lets secondary air into the exhaust is not answering electrically.',
  },
  P0413: {
    title: 'Secondary air injection switching valve A circuit open',
    brief: 'The circuit to the secondary air switching valve is open — a broken wire or a disconnected plug.',
  },
  P0414: {
    title: 'Secondary air injection switching valve A circuit shorted',
    brief: 'The secondary air switching valve circuit is shorted, so it draws current when it should not.',
  },
  P0415: {
    title: 'Secondary air injection switching valve B circuit malfunction',
    brief: 'The second secondary-air switching valve is not answering electrically.',
  },
  P0416: {
    title: 'Secondary air injection switching valve B circuit open',
    brief: 'The circuit to the second secondary-air switching valve is open.',
  },
  P0417: {
    title: 'Secondary air injection switching valve B circuit shorted',
    brief: 'The second secondary-air switching valve circuit is shorted.',
  },
  P0418: {
    title: 'Secondary air injection pump relay A circuit malfunction',
    brief: 'The relay that powers the secondary air pump is not switching as commanded.',
  },
  P0419: {
    title: 'Secondary air injection pump relay B circuit malfunction',
    brief: 'The second secondary air pump relay is not switching as commanded.',
  },
  P0491: {
    title: 'Secondary air injection insufficient flow, bank 1',
    brief:
      'Too little fresh air is reaching the bank 1 exhaust during the cold-start blow. A tired pump, a split hose, or a carboned check valve.',
  },
  P0492: {
    title: 'Secondary air injection insufficient flow, bank 2',
    brief:
      'Too little fresh air is reaching the bank 2 exhaust during the cold-start blow — the same causes, on the other side.',
  },

  // ── Catalyst efficiency, P0420–P0434 ────────────────────────────────────
  P0420: {
    title: 'Catalyst system efficiency below threshold, bank 1',
    brief:
      'The sensor after the bank 1 catalytic converter is starting to swing like the one in front of it, which means the converter is no longer storing and releasing oxygen properly.',
  },
  P0421: {
    title: 'Warm-up catalyst efficiency below threshold, bank 1',
    brief:
      'The small pre-catalyst close to the bank 1 exhaust manifold is not cleaning up as it should during warm-up.',
  },
  P0422: {
    title: 'Main catalyst efficiency below threshold, bank 1',
    brief: 'The main bank 1 catalytic converter is no longer converting enough of the exhaust to pass its own test.',
  },
  P0423: {
    title: 'Heated catalyst efficiency below threshold, bank 1',
    brief:
      'The electrically heated catalyst on bank 1 is not reaching the conversion the test expects even once warmed.',
  },
  P0424: {
    title: 'Heated catalyst temperature below threshold, bank 1',
    brief:
      'The bank 1 heated catalyst is not getting hot enough — its heater circuit, or a temperature sensor reading low.',
  },
  P0430: {
    title: 'Catalyst system efficiency below threshold, bank 2',
    brief:
      'The sensor behind the bank 2 catalytic converter now mirrors the one in front of it, so that converter has lost its oxygen storage.',
  },
  P0431: {
    title: 'Warm-up catalyst efficiency below threshold, bank 2',
    brief: 'The pre-catalyst near the bank 2 manifold is not cleaning up as it should during warm-up.',
  },
  P0432: {
    title: 'Main catalyst efficiency below threshold, bank 2',
    brief: 'The main bank 2 catalytic converter is no longer converting enough exhaust to pass its test.',
  },
  P0433: {
    title: 'Heated catalyst efficiency below threshold, bank 2',
    brief: 'The electrically heated catalyst on bank 2 is not converting as much as the test expects.',
  },
  P0434: {
    title: 'Heated catalyst temperature below threshold, bank 2',
    brief: 'The bank 2 heated catalyst is not reaching temperature — its heater circuit or its temperature sensor.',
  },

  // ── Fuel vapour system, P0440–P0459 and P0496–P0499 ─────────────────────
  P0440: {
    title: 'Evaporative emission control system malfunction',
    brief:
      'The system that traps petrol vapour from the tank and feeds it to the engine has failed a check, without naming which part. It affects emissions, not how the car drives.',
  },
  P0441: {
    title: 'Evaporative emission system incorrect purge flow',
    brief:
      'The stored vapour is not being drawn into the engine at the rate commanded. A purge valve stuck shut or stuck open, or a blocked hose.',
  },
  P0442: {
    title: 'Evaporative emission system small leak detected',
    brief:
      'The sealed vapour system loses pressure slowly. A loose or perished fuel cap seal first, then a cracked hose or a leaking purge valve.',
  },
  P0443: {
    title: 'Evaporative emission purge control valve circuit malfunction',
    brief:
      'The valve that lets stored vapour into the engine is not answering electrically. A stuck-open valve also causes a rough idle.',
  },
  P0444: {
    title: 'Evaporative emission purge control valve circuit open',
    brief: 'The purge valve circuit is open — a broken wire, a disconnected plug, or a failed coil.',
  },
  P0445: {
    title: 'Evaporative emission purge control valve circuit shorted',
    brief: 'The purge valve circuit is shorted, which usually means the valve is being held open constantly.',
  },
  P0446: {
    title: 'Evaporative emission vent control circuit malfunction',
    brief:
      'The vent valve lets the charcoal canister breathe, and seals it for leak testing. Its circuit is faulty, so the test cannot be run.',
  },
  P0447: {
    title: 'Evaporative emission vent control circuit open',
    brief: 'The vent valve circuit is open — a broken wire or a failed coil in the valve.',
  },
  P0448: {
    title: 'Evaporative emission vent control circuit shorted',
    brief:
      'The vent valve circuit is shorted, so the valve stays closed. A sealed tank can make the filler gun keep cutting off when refuelling.',
  },
  P0449: {
    title: 'Evaporative emission vent valve or solenoid circuit malfunction',
    brief: 'The vent valve solenoid is not switching as commanded — the coil, its plug, or the wiring.',
  },
  P0450: {
    title: 'Evaporative emission pressure sensor malfunction',
    brief:
      'The sensor that measures pressure inside the fuel tank system is not giving a usable signal, so leak tests cannot run.',
  },
  P0451: {
    title: 'Evaporative emission pressure sensor range/performance',
    brief:
      'The tank pressure reading is plausible but wrong — it does not move as the system is deliberately pressurised or vented.',
  },
  P0452: {
    title: 'Evaporative emission pressure sensor low input',
    brief: 'The tank pressure signal is below its valid range — a short to ground or a lost supply voltage.',
  },
  P0453: {
    title: 'Evaporative emission pressure sensor high input',
    brief: 'The tank pressure signal is above its valid range — an open circuit or a short to voltage.',
  },
  P0454: {
    title: 'Evaporative emission pressure sensor intermittent',
    brief: 'The tank pressure signal cuts in and out, pointing at a connector rather than the sensor.',
  },
  P0455: {
    title: 'Evaporative emission system gross leak detected',
    brief:
      'The vapour system will not hold pressure at all. Check the fuel cap is on and its seal intact, then look for a hose off the charcoal canister.',
  },
  P0456: {
    title: 'Evaporative emission system very small leak detected',
    brief:
      'A leak smaller than half a millimetre across. Almost always a cap seal or a perished rubber elbow, and it can take a smoke test to find.',
  },
  P0457: {
    title: 'Evaporative emission leak detected, fuel cap loose or missing',
    brief:
      'The leak test failed in the pattern that follows a cap left loose after refuelling. Tighten it until it clicks; the light clears itself after a few drives.',
  },
  P0458: {
    title: 'Evaporative emission purge control valve circuit low',
    brief: 'The purge valve control wire is shorted to ground, holding the valve open.',
  },
  P0459: {
    title: 'Evaporative emission purge control valve circuit high',
    brief: 'The purge valve control circuit is open or shorted to voltage, so the valve never opens.',
  },
  P0496: {
    title: 'Evaporative emission system high purge flow',
    brief:
      'Vapour is being drawn into the engine when the purge valve should be shut. The valve is leaking through, which upsets the idle and skews fuel trims.',
  },
  P0497: {
    title: 'Evaporative emission system low purge flow',
    brief:
      'Little or no vapour flows when purge is commanded. A blocked hose, a clogged charcoal canister, or a valve stuck shut.',
  },
  P0498: {
    title: 'Evaporative emission vent valve control circuit low',
    brief: 'The vent valve control wire is shorted to ground, holding the valve in one position.',
  },
  P0499: {
    title: 'Evaporative emission vent valve control circuit high',
    brief: 'The vent valve control circuit is open or shorted to voltage, so the valve never actuates.',
  },

  // ── Fuel level and purge flow sensors, P0460–P0469 ──────────────────────
  P0460: {
    title: 'Fuel level sensor circuit malfunction',
    brief:
      'The tank sender is not giving a usable signal. Besides the gauge, several emissions tests are skipped when the fuel level is unknown.',
  },
  P0461: {
    title: 'Fuel level sensor circuit range/performance',
    brief:
      'The fuel level reading moves in a way real fuel cannot — sticking at one value, or changing faster than the tank could empty. A worn sender track.',
  },
  P0462: {
    title: 'Fuel level sensor circuit low input',
    brief: 'The fuel level signal is below its valid range — a short to ground or a broken sender.',
  },
  P0463: {
    title: 'Fuel level sensor circuit high input',
    brief: 'The fuel level signal is above its valid range — an open circuit or a disconnected sender.',
  },
  P0464: {
    title: 'Fuel level sensor circuit intermittent',
    brief: 'The fuel level reading jumps about, typically a worn track on the sender arm.',
  },
  P0465: {
    title: 'Purge flow sensor circuit malfunction',
    brief: 'The sensor that measures vapour flow to the engine is not reporting.',
  },
  P0466: {
    title: 'Purge flow sensor circuit range/performance',
    brief: 'Purge flow is being reported, but it does not match what the purge valve was commanded to do.',
  },
  P0467: {
    title: 'Purge flow sensor circuit low input',
    brief: 'The purge flow signal is below its valid range — a short to ground or a lost supply.',
  },
  P0468: {
    title: 'Purge flow sensor circuit high input',
    brief: 'The purge flow signal is above its valid range — an open circuit or a short to voltage.',
  },
  P0469: {
    title: 'Purge flow sensor circuit intermittent',
    brief: 'The purge flow signal cuts in and out, pointing at a connector or a chafed wire.',
  },

  // ── Exhaust back pressure, P0470–P0479 ──────────────────────────────────
  P0470: {
    title: 'Exhaust pressure sensor malfunction',
    brief:
      'The sensor measuring pressure in the exhaust is not reporting. Diesels use it to judge how blocked the particulate filter is.',
  },
  P0471: {
    title: 'Exhaust pressure sensor range/performance',
    brief:
      'Exhaust pressure is reported but does not fit the engine load. Often the small sensing pipes are sooted up or split rather than the sensor being faulty.',
  },
  P0472: {
    title: 'Exhaust pressure sensor low',
    brief: 'The exhaust pressure signal is below its valid range — a short to ground or a disconnected sensor.',
  },
  P0473: {
    title: 'Exhaust pressure sensor high',
    brief: 'The exhaust pressure signal is above its valid range — a short to voltage, or a genuinely blocked exhaust.',
  },
  P0474: {
    title: 'Exhaust pressure sensor intermittent',
    brief: 'The exhaust pressure reading cuts in and out, usually a connector in a hot, exposed place.',
  },
  P0475: {
    title: 'Exhaust pressure control valve malfunction',
    brief:
      'The exhaust back-pressure valve, used to help a diesel warm up quickly, is not answering. It has often seized with soot.',
  },
  P0476: {
    title: 'Exhaust pressure control valve range/performance',
    brief: 'The exhaust back-pressure valve moves, but not as far as commanded — sticking rather than dead.',
  },
  P0477: {
    title: 'Exhaust pressure control valve low',
    brief: 'The exhaust back-pressure valve control circuit is shorted to ground.',
  },
  P0478: {
    title: 'Exhaust pressure control valve high',
    brief: 'The exhaust back-pressure valve control circuit is open or shorted to voltage.',
  },
  P0479: {
    title: 'Exhaust pressure control valve intermittent',
    brief: 'The exhaust back-pressure valve circuit makes and breaks, pointing at a connector or a chafed wire.',
  },

  // ── Cooling fans, P0480–P0485 ───────────────────────────────────────────
  P0480: {
    title: 'Cooling fan 1 control circuit malfunction',
    brief:
      'The computer cannot switch the first radiator fan. The fan motor, its relay, or the wiring between them.',
    risk: FAN_RISK,
  },
  P0481: {
    title: 'Cooling fan 2 control circuit malfunction',
    brief: 'The second radiator fan cannot be switched — its motor, relay, or wiring.',
    risk: FAN_RISK,
  },
  P0482: {
    title: 'Cooling fan 3 control circuit malfunction',
    brief: 'The third cooling fan cannot be switched — its motor, relay, or wiring.',
    risk: FAN_RISK,
  },
  P0483: {
    title: 'Cooling fan rationality check failed',
    brief:
      'The fans were commanded on but coolant temperature did not respond as it should, so the computer doubts they are actually turning. A seized motor, or a fan spinning the wrong way.',
    risk: FAN_RISK,
  },
  P0484: {
    title: 'Cooling fan circuit over current',
    brief:
      'A cooling fan is drawing more current than it should. A motor with worn bearings on its way to seizing, or debris jammed in the blades.',
    risk: FAN_RISK,
  },
  P0485: {
    title: 'Cooling fan power or ground circuit malfunction',
    brief:
      'The supply or the earth for a cooling fan is faulty. Corroded earth points behind the front bumper are the usual culprit.',
    risk: FAN_RISK,
  },
};
