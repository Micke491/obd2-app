import type { CatalogEntry } from '../types';

import { CHARGING_RISK } from './risks';

/** P2000–P2FFF: the second standard block — aftertreatment, drive-by-wire, boost. */
export const P2_CODES: Record<string, CatalogEntry> = {
  // ── Aftertreatment, P2000–P2003 ─────────────────────────────────────────
  P2000: {
    title: 'NOx trap efficiency below threshold, bank 1',
    brief:
      'The trap that stores nitrogen oxides between purges is no longer holding enough of them. Usually sulphur poisoning from fuel, or a trap that has simply aged out.',
  },
  P2001: {
    title: 'NOx trap efficiency below threshold, bank 2',
    brief: 'The bank 2 nitrogen oxide trap is no longer storing enough between purges — the same causes, other side.',
  },
  P2002: {
    title: 'Diesel particulate filter efficiency below threshold, bank 1',
    brief:
      'The particulate filter is not trapping soot as it should. The pressure across it no longer changes the way a healthy filter’s does — often a cracked or hollowed-out filter core.',
  },
  P2003: {
    title: 'Diesel particulate filter efficiency below threshold, bank 2',
    brief: 'The bank 2 particulate filter is no longer trapping soot as a healthy one would.',
  },

  // ── Intake manifold runners, P2004–P2017 ────────────────────────────────
  P2004: {
    title: 'Intake manifold runner control stuck open, bank 1',
    brief:
      'The flaps that change the length or swirl of the intake tract are stuck open on bank 1. Low-speed torque suffers and the idle can be rough. Carbon on the spindles is the usual cause.',
  },
  P2005: {
    title: 'Intake manifold runner control stuck open, bank 2',
    brief: 'The bank 2 intake flaps are stuck open, costing low-speed torque and smoothness.',
  },
  P2006: {
    title: 'Intake manifold runner control stuck closed, bank 1',
    brief:
      'The bank 1 intake flaps are stuck closed, which strangles the engine at high revs. Again normally carbon rather than a broken part.',
  },
  P2007: {
    title: 'Intake manifold runner control stuck closed, bank 2',
    brief: 'The bank 2 intake flaps are stuck closed, restricting airflow at higher engine speeds.',
  },
  P2008: {
    title: 'Intake manifold runner control circuit open, bank 1',
    brief: 'The circuit driving the bank 1 intake flap actuator is open — a broken wire or a failed motor winding.',
  },
  P2009: {
    title: 'Intake manifold runner control circuit low, bank 1',
    brief:
      'The bank 1 intake flap control wire is shorted to ground, so the actuator is driven whether or not it was commanded.',
  },
  P2010: {
    title: 'Intake manifold runner control circuit high, bank 1',
    brief: 'The bank 1 intake flap control circuit is shorted to voltage or open, so the actuator never moves.',
  },
  P2011: {
    title: 'Intake manifold runner control circuit open, bank 2',
    brief: 'The circuit driving the bank 2 intake flap actuator is open.',
  },
  P2012: {
    title: 'Intake manifold runner control circuit low, bank 2',
    brief:
      'The bank 2 intake flap control wire is shorted to ground, so the actuator is driven whether or not it was commanded.',
  },
  P2013: {
    title: 'Intake manifold runner control circuit high, bank 2',
    brief: 'The bank 2 intake flap control circuit is shorted to voltage or open.',
  },
  P2014: {
    title: 'Intake manifold runner position sensor circuit, bank 1',
    brief: 'The sensor reporting where the bank 1 intake flaps actually are is not giving a usable signal.',
  },
  P2015: {
    title: 'Intake manifold runner position sensor range/performance, bank 1',
    brief:
      'The bank 1 flap position sensor reports a position that does not match the command. The linkage has often broken — a known weak point on some diesels, where the plastic arm snaps.',
  },
  P2016: {
    title: 'Intake manifold runner position sensor circuit low, bank 1',
    brief: 'The bank 1 flap position signal is below its valid range — a short to ground or a lost supply.',
  },
  P2017: {
    title: 'Intake manifold runner position sensor circuit high, bank 1',
    brief: 'The bank 1 flap position signal is above its valid range — an open circuit or a short to voltage.',
  },

  // ── Exhaust temperature, P2031–P2084 ────────────────────────────────────
  P2031: {
    title: 'Exhaust gas temperature sensor circuit, bank 1 sensor 2',
    brief:
      'The second exhaust temperature sensor on bank 1, usually just before or after the particulate filter, is not reporting.',
  },
  P2032: {
    title: 'Exhaust gas temperature sensor circuit low, bank 1 sensor 2',
    brief:
      'The second bank 1 exhaust temperature signal is below its valid range — a short to ground, or a broken sensor element.',
  },
  P2033: {
    title: 'Exhaust gas temperature sensor circuit high, bank 1 sensor 2',
    brief:
      'The second bank 1 exhaust temperature signal is above its valid range, which normally means an open circuit or an unplugged sensor.',
  },
  P2080: {
    title: 'Exhaust gas temperature sensor range/performance, bank 1 sensor 1',
    brief:
      'The first bank 1 exhaust temperature sensor reads plausibly but does not track engine load. Filter regeneration is scheduled from these readings, so it may be blocked from running.',
  },
  P2084: {
    title: 'Exhaust gas temperature sensor range/performance, bank 1 sensor 2',
    brief: 'The second bank 1 exhaust temperature sensor reads plausibly but does not agree with the first one.',
  },

  // ── Valve timing actuator circuits, P2088–P2095 ─────────────────────────
  P2088: {
    title: 'Camshaft position actuator A control circuit low, bank 1',
    brief: 'The bank 1 intake valve timing solenoid’s control wire is shorted to ground.',
  },
  P2089: {
    title: 'Camshaft position actuator A control circuit high, bank 1',
    brief: 'The bank 1 intake valve timing solenoid’s circuit is open or shorted to voltage.',
  },
  P2090: {
    title: 'Camshaft position actuator B control circuit low, bank 1',
    brief: 'The bank 1 exhaust valve timing solenoid’s control wire is shorted to ground.',
  },
  P2091: {
    title: 'Camshaft position actuator B control circuit high, bank 1',
    brief: 'The bank 1 exhaust valve timing solenoid’s circuit is open or shorted to voltage.',
  },
  P2092: {
    title: 'Camshaft position actuator A control circuit low, bank 2',
    brief: 'The bank 2 intake valve timing solenoid’s control wire is shorted to ground.',
  },
  P2093: {
    title: 'Camshaft position actuator A control circuit high, bank 2',
    brief: 'The bank 2 intake valve timing solenoid’s circuit is open or shorted to voltage.',
  },
  P2094: {
    title: 'Camshaft position actuator B control circuit low, bank 2',
    brief: 'The bank 2 exhaust valve timing solenoid’s control wire is shorted to ground.',
  },
  P2095: {
    title: 'Camshaft position actuator B control circuit high, bank 2',
    brief: 'The bank 2 exhaust valve timing solenoid’s circuit is open or shorted to voltage.',
  },

  // ── Post-catalyst fuel trim, P2096–P2099 ────────────────────────────────
  P2096: {
    title: 'Post catalyst fuel trim system too lean, bank 1',
    brief:
      'The sensor behind the bank 1 converter reads lean enough that the computer has had to add fuel on top of its normal corrections. An exhaust leak before that sensor is the first thing to rule out.',
  },
  P2097: {
    title: 'Post catalyst fuel trim system too rich, bank 1',
    brief:
      'The sensor behind the bank 1 converter reads rich enough that the computer has had to take fuel away. A leaking injector, high fuel pressure, or a contaminated sensor.',
  },
  P2098: {
    title: 'Post catalyst fuel trim system too lean, bank 2',
    brief: 'The sensor behind the bank 2 converter reads lean, so extra fuel is being added on that bank.',
  },
  P2099: {
    title: 'Post catalyst fuel trim system too rich, bank 2',
    brief: 'The sensor behind the bank 2 converter reads rich, so fuel is being taken away on that bank.',
  },

  // ── Electronic throttle, P2100–P2138 ────────────────────────────────────
  P2100: {
    title: 'Throttle actuator control motor circuit open',
    brief:
      'The circuit to the motor that opens and closes the electronic throttle is open. With no motor drive the throttle springs to its limp position and the car barely moves.',
  },
  P2101: {
    title: 'Throttle actuator control motor range/performance',
    brief:
      'The throttle motor runs but the plate does not reach the commanded angle. Carbon around the plate, a worn motor, or a weakening return spring.',
  },
  P2102: {
    title: 'Throttle actuator control motor circuit low',
    brief:
      'The throttle motor circuit is shorted to ground, so the computer can no longer control how far the plate opens.',
  },
  P2103: {
    title: 'Throttle actuator control motor circuit high',
    brief: 'The throttle motor circuit is shorted to voltage or drawing far more current than it should.',
  },
  P2104: {
    title: 'Throttle actuator control system, forced idle',
    brief:
      'The computer no longer trusts the throttle system and has locked it at idle. This is the consequence of another throttle or pedal fault, not a fault in itself — find the code stored with it.',
  },
  P2105: {
    title: 'Throttle actuator control system, forced engine shutdown',
    brief:
      'The throttle system failed its safety checks badly enough that the computer shut the engine down. Read the codes stored alongside this one.',
  },
  P2106: {
    title: 'Throttle actuator control system, forced limited power',
    brief:
      'The computer has capped throttle opening because it cannot verify the throttle position. Again a consequence code — the cause is stored with it.',
  },
  P2107: {
    title: 'Throttle actuator control module processor',
    brief: 'The processor that drives the electronic throttle failed its own self-test.',
  },
  P2108: {
    title: 'Throttle actuator control module performance',
    brief: 'The throttle control electronics are running but not behaving as they should internally.',
  },
  P2109: {
    title: 'Throttle or pedal position sensor A minimum stop performance',
    brief:
      'The throttle does not return to the same closed position it learned. Carbon on the bore holding the plate off its stop, or a mechanical stop that has moved.',
  },
  P2110: {
    title: 'Throttle actuator control system, forced limited engine speed',
    brief: 'The computer has capped engine speed because it cannot verify throttle control. A consequence of another fault.',
  },
  P2111: {
    title: 'Throttle actuator control system stuck open',
    brief:
      'The throttle plate will not close when commanded. The computer will cut fuel to control the engine, so it may run very roughly.',
    risk: {
      severity: 'critical',
      drive: 'stop-now',
      note: 'A throttle that will not close is the one fault where the engine can keep making power against you. Stop somewhere safe and have it recovered.',
    },
  },
  P2112: {
    title: 'Throttle actuator control system stuck closed',
    brief:
      'The throttle plate will not open. Carbon or a broken return mechanism jamming it — the engine idles but will not accelerate.',
  },
  P2118: {
    title: 'Throttle actuator control motor current range/performance',
    brief:
      'The throttle motor is drawing the wrong current for the movement asked of it — extra friction in the throttle body, or a motor on its way out.',
  },
  P2119: {
    title: 'Throttle actuator control throttle body range/performance',
    brief:
      'The throttle body as a whole is not behaving mechanically as expected, usually because carbon has built up around the plate.',
  },
  P2120: {
    title: 'Throttle or pedal position sensor D circuit',
    brief: 'The first track in the accelerator pedal sensor is not giving a usable signal.',
  },
  P2121: {
    title: 'Throttle or pedal position sensor D range/performance',
    brief: 'The first pedal track reads plausibly but does not agree with the second one across the travel.',
  },
  P2122: {
    title: 'Throttle or pedal position sensor D circuit low',
    brief: 'The first pedal track signal is below its valid range — a short to ground or a lost 5V supply.',
  },
  P2123: {
    title: 'Throttle or pedal position sensor D circuit high',
    brief: 'The first pedal track signal is above its valid range — an open circuit or a short to voltage.',
  },
  P2125: {
    title: 'Throttle or pedal position sensor E circuit',
    brief: 'The second track in the accelerator pedal sensor is not giving a usable signal.',
  },
  P2126: {
    title: 'Throttle or pedal position sensor E range/performance',
    brief: 'The second pedal track reads plausibly but does not track the first one properly.',
  },
  P2127: {
    title: 'Throttle or pedal position sensor E circuit low',
    brief: 'The second pedal track signal is below its valid range — a short to ground or a lost supply.',
  },
  P2128: {
    title: 'Throttle or pedal position sensor E circuit high',
    brief: 'The second pedal track signal is above its valid range — an open circuit or a short to voltage.',
  },
  P2135: {
    title: 'Throttle position sensor A and B voltage correlation',
    brief:
      'The two position tracks in the throttle body disagree. They are deliberately different voltages that must stay in a fixed relationship, and they no longer do — a worn sensor, or a connector with a poor pin.',
  },
  P2138: {
    title: 'Pedal position sensor D and E voltage correlation',
    brief:
      'The two tracks in the accelerator pedal disagree about how far it is pressed. Most cars force reduced power immediately, because the pedal can no longer be trusted.',
  },

  // ── Injector supply and fuel trim by condition, P2146–P2198 ────────────
  P2146: {
    title: 'Fuel injector group A supply voltage circuit open',
    brief:
      'The supply feeding the first group of injectors is open, so none of them can fire. That is half the engine on many V configurations.',
  },
  P2147: {
    title: 'Fuel injector group A supply voltage circuit low',
    brief: 'The supply to the first injector group is shorted to ground.',
  },
  P2148: {
    title: 'Fuel injector group A supply voltage circuit high',
    brief: 'The supply to the first injector group is shorted to voltage or reading far above normal.',
  },
  P2149: {
    title: 'Fuel injector group B supply voltage circuit open',
    brief: 'The supply feeding the second group of injectors is open, so that group cannot fire.',
  },
  P2150: {
    title: 'Fuel injector group B supply voltage circuit low',
    brief: 'The supply to the second injector group is shorted to ground.',
  },
  P2151: {
    title: 'Fuel injector group B supply voltage circuit high',
    brief: 'The supply to the second injector group is shorted to voltage.',
  },
  P2177: {
    title: 'System too lean off idle, bank 1',
    brief:
      'Bank 1 runs lean once you are off idle but not at idle. That pattern points at a vacuum leak that seals up at low airflow, or fuel delivery falling short under load.',
  },
  P2178: {
    title: 'System too rich off idle, bank 1',
    brief:
      'Bank 1 runs rich off idle. Excess fuel pressure, a leaking injector that shows up once flow increases, or an air flow meter over-reading.',
  },
  P2179: {
    title: 'System too lean off idle, bank 2',
    brief: 'Bank 2 runs lean once off idle — the same pattern as P2177 on the other bank.',
  },
  P2180: {
    title: 'System too rich off idle, bank 2',
    brief: 'Bank 2 runs rich once off idle — the same pattern as P2178 on the other bank.',
  },
  P2181: {
    title: 'Cooling system performance',
    brief:
      'The engine is not warming up, cooling down, or holding temperature the way the computer expects. A stuck thermostat, a low coolant level, or an air lock after a coolant change.',
  },
  P2185: {
    title: 'Engine coolant temperature sensor 2 circuit high',
    brief: 'The second coolant temperature sensor reads at the top of its range, which normally means an open circuit.',
  },
  P2186: {
    title: 'Engine coolant temperature sensor 2 circuit low',
    brief: 'The second coolant temperature sensor reads at the bottom of its range, normally a short to ground.',
  },
  P2187: {
    title: 'System too lean at idle, bank 1',
    brief:
      'Bank 1 runs lean specifically at idle. That is the signature of a vacuum leak — at idle a small leak is a large share of the total airflow, and it disappears once the throttle opens.',
  },
  P2188: {
    title: 'System too rich at idle, bank 1',
    brief:
      'Bank 1 runs rich specifically at idle. A leaking injector, a purge valve stuck open, or fuel pressure that is too high at low demand.',
  },
  P2189: {
    title: 'System too lean at idle, bank 2',
    brief: 'Bank 2 runs lean at idle — the vacuum leak signature, on the other bank.',
  },
  P2190: {
    title: 'System too rich at idle, bank 2',
    brief: 'Bank 2 runs rich at idle — a leaking injector or excess fuel pressure on that bank.',
  },
  P2191: {
    title: 'System too lean at higher load, bank 1',
    brief:
      'Bank 1 holds its mixture at idle but goes lean under load. That points at fuel supply running out of capacity — a tired pump or a blocked filter — rather than an air leak.',
  },
  P2192: {
    title: 'System too rich at higher load, bank 1',
    brief: 'Bank 1 goes rich under load. Fuel pressure too high, or an air flow meter over-reading as flow increases.',
  },
  P2193: {
    title: 'System too lean at higher load, bank 2',
    brief: 'Bank 2 goes lean under load, pointing at fuel supply capacity rather than an air leak.',
  },
  P2194: {
    title: 'System too rich at higher load, bank 2',
    brief: 'Bank 2 goes rich under load — excess fuel pressure or an over-reading air flow meter.',
  },
  P2195: {
    title: 'Oxygen sensor signal stuck lean, bank 1 sensor 1',
    brief:
      'Bank 1’s upstream sensor is holding a lean reading and will not swing. The computer keeps adding fuel in response, so the engine can end up genuinely rich while the code says lean.',
  },
  P2196: {
    title: 'Oxygen sensor signal stuck rich, bank 1 sensor 1',
    brief:
      'Bank 1’s upstream sensor is holding a rich reading and will not swing, so the computer keeps pulling fuel out and the engine can end up genuinely lean.',
  },
  P2197: {
    title: 'Oxygen sensor signal stuck lean, bank 2 sensor 1',
    brief: 'Bank 2’s upstream sensor is stuck at a lean reading, so the computer over-fuels that bank in response.',
  },
  P2198: {
    title: 'Oxygen sensor signal stuck rich, bank 2 sensor 1',
    brief: 'Bank 2’s upstream sensor is stuck at a rich reading, so the computer under-fuels that bank in response.',
  },

  // ── NOx sensing and barometric pressure, P2200–P2230 ───────────────────
  P2200: {
    title: 'NOx sensor circuit, bank 1',
    brief:
      'The sensor measuring nitrogen oxides in the bank 1 exhaust is not reporting. Diesels use it to decide when to purge the NOx trap or dose the exhaust fluid.',
  },
  P2201: {
    title: 'NOx sensor circuit range/performance, bank 1',
    brief: 'The bank 1 NOx sensor reports a value that does not fit the engine load and aftertreatment state.',
  },
  P2202: {
    title: 'NOx sensor circuit low, bank 1',
    brief: 'The bank 1 NOx sensor signal is below its valid range — a short to ground or a failed sensor.',
  },
  P2203: {
    title: 'NOx sensor circuit high, bank 1',
    brief: 'The bank 1 NOx sensor signal is above its valid range — an open circuit or a short to voltage.',
  },
  P2226: {
    title: 'Barometric pressure circuit',
    brief:
      'The barometric pressure sensor is not reporting. Air density changes with altitude and weather, and fuelling is corrected from this reading.',
  },
  P2227: {
    title: 'Barometric pressure circuit range/performance',
    brief:
      'Barometric pressure is reported but does not agree with the manifold sensor with the engine off, so one of them has drifted.',
  },
  P2228: {
    title: 'Barometric pressure circuit low',
    brief: 'The barometric pressure signal is below its valid range — a short to ground or a lost supply.',
  },
  P2229: {
    title: 'Barometric pressure circuit high',
    brief: 'The barometric pressure signal is above its valid range — an open circuit or a short to voltage.',
  },
  P2230: {
    title: 'Barometric pressure circuit intermittent',
    brief: 'The barometric pressure reading cuts in and out, pointing at a connector rather than the sensor.',
  },

  // ── Wideband oxygen sensor drive, P2237–P2251 ──────────────────────────
  P2237: {
    title: 'Oxygen sensor positive current control circuit open, bank 1 sensor 1',
    brief:
      'A wideband oxygen sensor is driven by a small pumping current rather than simply read. That drive circuit is open on bank 1’s upstream sensor, so no reading is possible.',
  },
  P2238: {
    title: 'Oxygen sensor positive current control circuit low, bank 1 sensor 1',
    brief: 'The pumping current drive to bank 1’s upstream wideband sensor is shorted to ground.',
  },
  P2239: {
    title: 'Oxygen sensor positive current control circuit high, bank 1 sensor 1',
    brief: 'The pumping current drive to bank 1’s upstream wideband sensor is shorted to voltage.',
  },
  P2251: {
    title: 'Oxygen sensor negative current control circuit open, bank 1 sensor 1',
    brief: 'The return side of the wideband sensor’s pumping current circuit is open on bank 1’s upstream sensor.',
  },

  // ── Boost and intake, P2261–P2282 ───────────────────────────────────────
  P2261: {
    title: 'Turbocharger bypass valve, mechanical fault',
    brief:
      'The valve that routes air around the turbo is not moving as it should, and the computer has judged the fault mechanical rather than electrical — a seized linkage or a torn diaphragm.',
  },
  P2262: {
    title: 'Turbocharger boost pressure not detected, mechanical fault',
    brief:
      'The turbo is being commanded to make boost and none appears, with the control circuits testing good. A seized turbo, a sheared shaft, or a large leak in the pipework.',
  },
  P2263: {
    title: 'Turbocharger or supercharger boost system performance',
    brief:
      'Boost is present but not at the level asked for across the range. Sticking variable vanes, a leaking intercooler pipe, or a wastegate not holding shut.',
  },
  P2264: {
    title: 'Water in fuel sensor circuit',
    brief:
      'The sensor in the diesel filter that detects collected water is not reporting. It matters because water reaching the injection pump destroys it.',
  },
  P2270: {
    title: 'Oxygen sensor signal stuck lean, bank 1 sensor 2',
    brief:
      'The sensor behind the bank 1 converter is stuck at a lean reading. An exhaust leak drawing fresh air in ahead of it will do this, as will an aged sensor.',
  },
  P2271: {
    title: 'Oxygen sensor signal stuck rich, bank 1 sensor 2',
    brief:
      'The sensor behind the bank 1 converter is stuck at a rich reading — contamination on the tip, or a genuinely rich exhaust.',
  },
  P2279: {
    title: 'Intake air system leak',
    brief:
      'Air is entering the engine after the air flow meter has measured it, so the computer is under-fuelling. A split intake hose, a loose clamp, or a leaking gasket.',
  },
  P2280: {
    title: 'Air flow restriction or leak between the filter and the air flow meter',
    brief:
      'The measured airflow does not fit the throttle and manifold readings, and the computer has placed the problem before the meter — a blocked air filter, or a split in the inlet duct.',
  },
  P2282: {
    title: 'Air leak between the throttle body and the intake valves',
    brief:
      'Unmetered air is getting in downstream of the throttle. An intake manifold gasket, a cracked plenum, or a vacuum hose pulled off.',
  },

  // ── Exhaust gas recirculation and particulate filter, P2413–P2463 ──────
  P2413: {
    title: 'Exhaust gas recirculation system performance',
    brief:
      'The EGR system moves gas but not in the quantity commanded across the operating range. Carbon in the valve or the cooler passages is the usual answer.',
  },
  P2414: {
    title: 'Oxygen sensor exhaust sample error, bank 1 sensor 1',
    brief:
      'Bank 1’s upstream oxygen sensor is not seeing a true sample of the exhaust — normally an exhaust leak upstream of it letting fresh air in.',
  },
  P2422: {
    title: 'Evaporative emission vent valve stuck closed',
    brief:
      'The vent valve is not opening, so the fuel tank cannot breathe. The clearest symptom is the filler gun cutting off repeatedly while refuelling.',
  },
  P2425: {
    title: 'Exhaust gas recirculation cooling valve control circuit open',
    brief: 'The circuit driving the EGR cooler bypass valve is open, so exhaust gas cannot be routed around the cooler.',
  },
  P242F: {
    title: 'Diesel particulate filter restricted, ash accumulation',
    brief:
      'The filter is blocked with ash rather than soot. Ash comes from burnt oil and cannot be burnt off, so no amount of regeneration will clear it — the filter needs cleaning or replacing.',
  },
  P2431: {
    title: 'Secondary air injection air flow or pressure sensor range/performance, bank 1',
    brief: 'The sensor watching the cold-start air injection reports a flow that does not match what was commanded.',
  },
  P2440: {
    title: 'Secondary air injection switching valve stuck open, bank 1',
    brief:
      'The bank 1 secondary air valve is not closing after the cold-start blow, so exhaust can push back into the pump.',
  },
  P2441: {
    title: 'Secondary air injection switching valve stuck closed, bank 1',
    brief: 'The bank 1 secondary air valve is not opening, so no air reaches the exhaust during warm-up.',
  },
  P2442: {
    title: 'Secondary air injection switching valve stuck open, bank 2',
    brief: 'The bank 2 secondary air valve is not closing after the cold-start blow.',
  },
  P2443: {
    title: 'Secondary air injection switching valve stuck closed, bank 2',
    brief: 'The bank 2 secondary air valve is not opening during warm-up.',
  },
  P244A: {
    title: 'Diesel particulate filter differential pressure too low',
    brief:
      'The pressure drop across the filter is lower than a healthy one produces. That usually means the sensing pipes are split or disconnected — or that the filter core is gone.',
  },
  P244B: {
    title: 'Diesel particulate filter differential pressure too high',
    brief:
      'The pressure drop across the filter is higher than it should be, so the filter is blocking up. A run of short journeys that never let it regenerate is the common cause.',
  },
  P2452: {
    title: 'Diesel particulate filter pressure sensor circuit',
    brief:
      'The sensor measuring pressure across the particulate filter is not reporting, so the computer cannot tell how full the filter is.',
  },
  P2453: {
    title: 'Diesel particulate filter pressure sensor range/performance',
    brief:
      'The filter pressure sensor reports a value that does not fit engine load. Sooted or split sensing pipes are far more common than a failed sensor.',
  },
  P2454: {
    title: 'Diesel particulate filter pressure sensor circuit low',
    brief: 'The filter pressure signal is below its valid range — a short to ground or a lost supply.',
  },
  P2455: {
    title: 'Diesel particulate filter pressure sensor circuit high',
    brief: 'The filter pressure signal is above its valid range — an open circuit or a short to voltage.',
  },
  P2458: {
    title: 'Diesel particulate filter regeneration duration',
    brief:
      'A regeneration ran for longer than allowed without clearing the filter. Usually because the journey ended before it finished, repeatedly.',
  },
  P2459: {
    title: 'Diesel particulate filter regeneration frequency',
    brief:
      'The filter is asking to regenerate far more often than it should. Either it is not clearing properly, or the engine is producing more soot than normal.',
  },
  P2463: {
    title: 'Diesel particulate filter restricted, soot accumulation',
    brief:
      'The filter is full of soot. Unlike ash, soot can be burnt off — a sustained run at motorway speed often triggers the regeneration that clears it.',
  },

  // ── Charging and boost control position, P2500–P2565 ───────────────────
  P2500: {
    title: 'Generator lamp terminal circuit low',
    brief: 'The alternator warning lamp terminal is being pulled low, which can also stop the alternator exciting.',
    risk: CHARGING_RISK,
  },
  P2501: {
    title: 'Generator lamp terminal circuit high',
    brief: 'The alternator warning lamp terminal is stuck high, so the lamp may never warn of a charging failure.',
  },
  P2502: {
    title: 'Charging system voltage',
    brief: 'Charging voltage is outside its expected window — the alternator, its regulator, or the wiring to the battery.',
    risk: CHARGING_RISK,
  },
  P2503: {
    title: 'Charging system voltage low',
    brief:
      'The alternator is not producing enough voltage to keep up with the car’s demand, so the battery is being drained as you drive.',
    risk: CHARGING_RISK,
  },
  P2504: {
    title: 'Charging system voltage high',
    brief:
      'The alternator is over-charging. Sustained high voltage boils the battery and can damage electronics, so this is worth acting on promptly.',
    risk: CHARGING_RISK,
  },
  P2510: {
    title: 'Engine computer power relay sense circuit range/performance',
    brief:
      'The voltage the computer sees back from its own main relay is not what it expects. Worn relay contacts, and a cause of intermittent stalling.',
  },
  P2544: {
    title: 'Torque management request input signal A',
    brief:
      'A request from another module to reduce engine torque — normally from the transmission during a shift, or from traction control — is not being received properly.',
  },
  P2563: {
    title: 'Turbocharger boost control position sensor range/performance',
    brief:
      'The sensor reporting where the variable-vane or wastegate actuator is sitting does not agree with the commanded position. Soot-seized vanes are the classic cause on a diesel.',
  },
  P2564: {
    title: 'Turbocharger boost control position sensor circuit low',
    brief: 'The boost actuator position signal is below its valid range — a short to ground or a lost supply.',
  },
  P2565: {
    title: 'Turbocharger boost control position sensor circuit high',
    brief: 'The boost actuator position signal is above its valid range — an open circuit or a short to voltage.',
  },
  P2610: {
    title: 'Engine computer ignition-off timer performance',
    brief:
      'The timer the computer uses to measure how long the engine has been standing is unreliable. Several cold-start tests depend on knowing the engine really has cooled overnight.',
  },
};
