import type { CatalogEntry } from '../types';

import { TIMING_RISK } from './risks';

/** P0000–P01FF: valve timing, air and fuel metering, oxygen sensors, fuel trim. */
export const AIR_FUEL: Record<string, CatalogEntry> = {
  // ── Variable valve timing, P0010–P0025 ──────────────────────────────────
  P0010: {
    title: 'Camshaft position actuator A circuit, bank 1',
    brief:
      'The valve timing solenoid on bank 1 is not answering electrically. The computer switched it and saw no current change, so the fault is the coil, its plug or its wiring — not oil flow.',
  },
  P0011: {
    title: 'Camshaft position timing over-advanced, bank 1',
    brief:
      'Bank 1 intake camshaft is further advanced than the computer asked for and will not come back. The timing solenoid is stuck open or its oil passage is sludged, so the phaser keeps pressure it should have released.',
  },
  P0012: {
    title: 'Camshaft position timing over-retarded, bank 1',
    brief:
      'Bank 1 intake camshaft will not advance when commanded. Either the solenoid is not passing oil, the oil is too thick or too low, or the phaser is worn and cannot hold position.',
  },
  P0013: {
    title: 'Camshaft position actuator B circuit, bank 1',
    brief:
      'Same electrical fault as the A solenoid, on the second camshaft of bank 1 — the exhaust cam on most engines. The coil or its wiring is open or shorted.',
  },
  P0014: {
    title: 'Camshaft position timing over-advanced, bank 1 exhaust',
    brief:
      'The bank 1 exhaust camshaft is sitting advanced of the commanded position. A solenoid stuck open, a blocked oil screen, or a worn phaser holding oil it should have dumped.',
  },
  P0015: {
    title: 'Camshaft position timing over-retarded, bank 1 exhaust',
    brief:
      'The bank 1 exhaust camshaft will not move to where it was commanded. Low or dirty oil starves the phaser, or the solenoid screen is clogged.',
  },
  P0016: {
    title: 'Crankshaft and camshaft position correlation, bank 1 sensor A',
    brief:
      'The crank sensor and the bank 1 intake cam sensor disagree about where the engine is in its cycle. The chain or belt has stretched or jumped a tooth, or a phaser is stuck away from its rest position.',
    risk: {
      severity: 'serious',
      drive: 'limp-to-shop',
      note: 'A chain that has already jumped one tooth can jump another, and on most engines that bends valves. Keep the trip short.',
    },
  },
  P0017: {
    title: 'Crankshaft and camshaft position correlation, bank 1 sensor B',
    brief:
      'Same disagreement as P0016 but measured against the bank 1 exhaust camshaft — the crank and that cam are out of step with each other.',
    risk: TIMING_RISK,
  },
  P0018: {
    title: 'Crankshaft and camshaft position correlation, bank 2 sensor A',
    brief:
      'The crank sensor and the bank 2 intake cam sensor are out of step. On a V engine this points at that bank’s chain, tensioner or phaser rather than the whole timing drive.',
    risk: TIMING_RISK,
  },
  P0019: {
    title: 'Crankshaft and camshaft position correlation, bank 2 sensor B',
    brief:
      'The crank sensor and the bank 2 exhaust cam sensor are out of step, pointing at that bank’s chain, tensioner or exhaust phaser.',
    risk: TIMING_RISK,
  },
  P0020: {
    title: 'Camshaft position actuator A circuit, bank 2',
    brief:
      'The bank 2 intake valve timing solenoid is electrically dead or shorted. The computer commands it and sees no matching current.',
  },
  P0021: {
    title: 'Camshaft position timing over-advanced, bank 2',
    brief:
      'The bank 2 intake camshaft is running ahead of the commanded position — a solenoid stuck open or a phaser that will not release oil pressure.',
  },
  P0022: {
    title: 'Camshaft position timing over-retarded, bank 2',
    brief:
      'The bank 2 intake camshaft will not advance when asked. Usually oil that is low, thick or dirty enough that the phaser cannot fill.',
  },
  P0023: {
    title: 'Camshaft position actuator B circuit, bank 2',
    brief:
      'The bank 2 exhaust valve timing solenoid is electrically open or shorted — the coil itself, its connector, or the wire back to the computer.',
  },
  P0024: {
    title: 'Camshaft position timing over-advanced, bank 2 exhaust',
    brief:
      'The bank 2 exhaust camshaft is advanced of where it was commanded, and stays there. A stuck solenoid or a phaser holding oil.',
  },
  P0025: {
    title: 'Camshaft position timing over-retarded, bank 2 exhaust',
    brief:
      'The bank 2 exhaust camshaft will not reach the commanded position — restricted oil supply to the phaser, or the phaser itself worn.',
  },

  // ── Oxygen sensor heaters, P0030–P0058 ──────────────────────────────────
  P0030: {
    title: 'Oxygen sensor heater control circuit, bank 1 sensor 1',
    brief:
      'The heater inside the upstream oxygen sensor on bank 1 is not drawing its normal current. Until that sensor is hot it reads nothing, so the engine stays on a fixed fuel map after every cold start.',
  },
  P0031: {
    title: 'Oxygen sensor heater circuit low, bank 1 sensor 1',
    brief:
      'The heater circuit for bank 1’s upstream oxygen sensor is sitting at near zero volts — a short to ground in the wiring, or a heater element that has failed short.',
  },
  P0032: {
    title: 'Oxygen sensor heater circuit high, bank 1 sensor 1',
    brief:
      'The heater circuit for bank 1’s upstream oxygen sensor is stuck at battery voltage, which means no current is flowing: an open wire, a blown fuse, or a burnt-out heater element.',
  },
  P0036: {
    title: 'Oxygen sensor heater control circuit, bank 1 sensor 2',
    brief:
      'The heater in the oxygen sensor after the bank 1 catalytic converter is not behaving. That sensor only grades the converter, so fuelling is unaffected — but the converter test cannot run.',
  },
  P0037: {
    title: 'Oxygen sensor heater circuit low, bank 1 sensor 2',
    brief:
      'The heater circuit for the sensor behind the bank 1 converter is pulled to ground — chafed wiring against the exhaust, or a shorted heater element.',
  },
  P0038: {
    title: 'Oxygen sensor heater circuit high, bank 1 sensor 2',
    brief:
      'No current is reaching the heater in the sensor behind the bank 1 converter: an open circuit, a blown fuse, or the element inside the sensor has burnt out.',
  },
  P0050: {
    title: 'Oxygen sensor heater control circuit, bank 2 sensor 1',
    brief:
      'The heater in the upstream oxygen sensor on bank 2 is not drawing normal current, so that bank takes far longer to start correcting its own fuelling.',
  },
  P0051: {
    title: 'Oxygen sensor heater circuit low, bank 2 sensor 1',
    brief:
      'The heater circuit for bank 2’s upstream oxygen sensor is shorted to ground, either in the harness or inside the sensor.',
  },
  P0052: {
    title: 'Oxygen sensor heater circuit high, bank 2 sensor 1',
    brief:
      'The heater circuit for bank 2’s upstream oxygen sensor is open — no current flows at all. A fuse, a broken wire, or a burnt-out element.',
  },
  P0056: {
    title: 'Oxygen sensor heater control circuit, bank 2 sensor 2',
    brief:
      'The heater in the sensor behind the bank 2 catalytic converter is not drawing its normal current. Fuelling is unaffected; the converter test is.',
  },
  P0057: {
    title: 'Oxygen sensor heater circuit low, bank 2 sensor 2',
    brief:
      'The heater circuit for the sensor behind the bank 2 converter is shorted to ground — commonly wiring melted against the exhaust pipe.',
  },
  P0058: {
    title: 'Oxygen sensor heater circuit high, bank 2 sensor 2',
    brief:
      'No current is reaching the heater in the sensor behind the bank 2 converter. Check the fuse before condemning the sensor.',
  },

  // ── Cross-checks and ambient air, P0068–P0074 ───────────────────────────
  P0068: {
    title: 'Air flow and throttle position correlation',
    brief:
      'The throttle says it is open a certain amount but the air flow or manifold pressure sensor does not agree. One of the three is lying, or there is a large unmetered air leak between them.',
  },
  P0069: {
    title: 'Manifold pressure and barometric pressure correlation',
    brief:
      'With the engine off, manifold pressure and outside air pressure should read the same. They do not, so one of the two sensors has drifted or a hose is blocked.',
  },
  P0070: {
    title: 'Ambient air temperature sensor circuit',
    brief:
      'The outside air temperature sensor, usually behind the front bumper, is not giving a usable signal. It feeds the climate control and some fuelling corrections.',
  },
  P0071: {
    title: 'Ambient air temperature sensor range/performance',
    brief:
      'The outside temperature reading is possible but wrong — it disagrees with the intake and coolant sensors after a long soak, so the sensor has drifted.',
  },
  P0072: {
    title: 'Ambient air temperature sensor circuit low',
    brief:
      'The outside air temperature signal is at the bottom of its range, reporting an impossible cold. A short to ground in the wiring is the usual cause.',
  },
  P0073: {
    title: 'Ambient air temperature sensor circuit high',
    brief:
      'The outside air temperature signal is at the top of its range, reporting an impossible heat. Normally an open circuit or a disconnected plug.',
  },
  P0074: {
    title: 'Ambient air temperature sensor circuit intermittent',
    brief:
      'The outside temperature reading jumps around in a way real air cannot. A loose connector or a chafed wire making and breaking contact.',
  },

  // ── Fuel supply pressure, P0087–P0098 ───────────────────────────────────
  P0087: {
    title: 'Fuel rail or system pressure too low',
    brief:
      'Measured fuel pressure is below what the computer commanded, most often under load. A tired pump, a blocked filter, a leaking regulator, or on a diesel a worn high-pressure pump.',
    risk: {
      severity: 'serious',
      drive: 'limp-to-shop',
      note: 'The engine can cut out under acceleration, which is dangerous when overtaking or joining a fast road.',
    },
  },
  P0088: {
    title: 'Fuel rail or system pressure too high',
    brief:
      'Fuel pressure is above the commanded value. The pressure regulator or its control valve is stuck closed, or the return line is blocked.',
    risk: {
      severity: 'serious',
      drive: 'limp-to-shop',
      note: 'Over-pressure forces extra fuel through the injectors, which washes oil off the bores and can hydraulic-lock a cylinder.',
    },
  },
  P0089: {
    title: 'Fuel pressure regulator 1 performance',
    brief:
      'The regulator responds, but not by as much as it was told to. It is sticking, worn, or fighting a pump that can no longer supply enough volume.',
  },
  P0090: {
    title: 'Fuel pressure regulator 1 control circuit',
    brief:
      'The computer cannot drive the fuel pressure regulator solenoid at all — an electrical fault in the coil, plug or wiring rather than a pressure problem.',
  },
  P0091: {
    title: 'Fuel pressure regulator 1 control circuit low',
    brief:
      'The fuel pressure regulator control wire is shorted to ground, so the solenoid is being held on when it should not be.',
  },
  P0092: {
    title: 'Fuel pressure regulator 1 control circuit high',
    brief:
      'The fuel pressure regulator control circuit is open or shorted to voltage, so the solenoid never energises.',
  },
  P0093: {
    title: 'Fuel system large leak detected',
    brief:
      'Rail pressure falls far faster than the injectors can account for. Fuel is escaping — a split high-pressure pipe, a leaking injector seal, or a failed pump seal.',
    risk: {
      severity: 'critical',
      drive: 'stop-now',
      note: 'This is liquid fuel leaking near a hot engine. Stop, switch off, and look for wetness or smell before restarting.',
    },
  },
  P0094: {
    title: 'Fuel system small leak detected',
    brief:
      'Rail pressure bleeds away slightly faster than it should. A weeping injector, a pipe union not fully torqued, or a regulator seat that no longer seals.',
    risk: {
      severity: 'serious',
      drive: 'limp-to-shop',
      note: 'A small fuel leak grows. Have it found before it becomes a large one next to a hot exhaust.',
    },
  },
  P0096: {
    title: 'Intake air temperature sensor 2 range/performance',
    brief:
      'The second intake air sensor, normally after the intercooler, reads a temperature that does not fit the first one or the conditions. It has drifted rather than failed outright.',
  },
  P0097: {
    title: 'Intake air temperature sensor 2 circuit low',
    brief:
      'The post-intercooler air temperature signal is stuck at the cold end of its range — a short to ground, or a sensor that has failed short.',
  },
  P0098: {
    title: 'Intake air temperature sensor 2 circuit high',
    brief:
      'The post-intercooler air temperature signal is stuck at the hot end of its range, which normally means an open circuit or an unplugged sensor.',
  },

  // ── Air flow metering, P0100–P0109 ──────────────────────────────────────
  P0100: {
    title: 'Mass or volume air flow circuit malfunction',
    brief:
      'The air flow meter is not sending a signal the computer can use at all. Without it the engine has to guess how much air it is taking in, so fuelling is estimated rather than measured.',
  },
  P0101: {
    title: 'Mass or volume air flow circuit range/performance',
    brief:
      'The air flow meter is working but reporting a figure that does not match engine speed and throttle position. A dirty sensing wire, or unmetered air entering after it through a split intake hose.',
  },
  P0102: {
    title: 'Mass or volume air flow circuit low input',
    brief:
      'The air flow meter is reporting less air than the engine could possibly be running on. A disconnected plug, a broken signal wire, or a sensor element contaminated by oil.',
  },
  P0103: {
    title: 'Mass or volume air flow circuit high input',
    brief:
      'The air flow meter is reporting more air than the engine can physically draw. Usually a short to voltage in the wiring rather than a genuine reading.',
  },
  P0104: {
    title: 'Mass or volume air flow circuit intermittent',
    brief:
      'The air flow signal cuts in and out. A loose connector, a chafed wire, or a cracked sensor body that only misbehaves when it flexes or warms.',
  },
  P0105: {
    title: 'Manifold absolute pressure circuit malfunction',
    brief:
      'The manifold pressure sensor is giving no usable signal. That sensor is how the computer knows engine load, so it falls back on a default load table.',
  },
  P0106: {
    title: 'Manifold absolute pressure circuit range/performance',
    brief:
      'Manifold pressure is a believable number but the wrong one for the throttle opening and engine speed. A blocked or split vacuum hose to the sensor, a leaking intake gasket, or a drifting sensor.',
  },
  P0107: {
    title: 'Manifold absolute pressure circuit low input',
    brief:
      'The manifold pressure signal has dropped below anything the sensor can genuinely produce — a short to ground, a broken signal wire, or a lost supply voltage.',
  },
  P0108: {
    title: 'Manifold absolute pressure circuit high input',
    brief:
      'The manifold pressure signal is above its legitimate range, reporting more pressure than the manifold can hold. Normally a short to voltage or a disconnected vacuum line letting it read atmospheric.',
  },
  P0109: {
    title: 'Manifold absolute pressure circuit intermittent',
    brief:
      'The manifold pressure reading drops out and returns. A connector that is not quite seated, or a wire breaking inside its insulation.',
  },

  // ── Intake air temperature, P0110–P0114 ─────────────────────────────────
  P0110: {
    title: 'Intake air temperature circuit malfunction',
    brief:
      'The sensor measuring the temperature of the air entering the engine has stopped giving a usable reading. Air density is then assumed rather than calculated.',
  },
  P0111: {
    title: 'Intake air temperature circuit range/performance',
    brief:
      'Intake air temperature is plausible but does not track reality — after a cold night it should match the coolant and outside sensors, and it does not.',
  },
  P0112: {
    title: 'Intake air temperature circuit low input',
    brief:
      'The intake air temperature signal is pinned at the low end, reporting air far colder than possible. A short to ground in the wiring is the usual cause.',
  },
  P0113: {
    title: 'Intake air temperature circuit high input',
    brief:
      'The intake air temperature signal is pinned at the high end, reporting impossibly hot air. Almost always an open circuit or an unplugged sensor rather than real heat.',
  },
  P0114: {
    title: 'Intake air temperature circuit intermittent',
    brief:
      'The intake air temperature reading jumps unrealistically. A poor connection at the plug, or a wire broken inside its sheath.',
  },

  // ── Coolant temperature, P0115–P0129 ────────────────────────────────────
  P0115: {
    title: 'Engine coolant temperature circuit malfunction',
    brief:
      'The coolant temperature sensor the engine computer uses is not producing a usable signal. This is the sensor that governs cold-start enrichment and the cooling fans, not the one feeding the dashboard gauge.',
  },
  P0116: {
    title: 'Engine coolant temperature circuit range/performance',
    brief:
      'Coolant temperature is in range but wrong — it climbs too slowly, sits at an odd value, or disagrees with the intake sensor after an overnight stand.',
  },
  P0117: {
    title: 'Engine coolant temperature circuit low input',
    brief:
      'The coolant temperature signal is at the bottom of its range, reporting a temperature the engine cannot actually be at. Usually a short to ground in the sensor or its wiring.',
  },
  P0118: {
    title: 'Engine coolant temperature circuit high input',
    brief:
      'The coolant signal is at the top of its range. On these sensors that means an open circuit — a disconnected plug or broken wire — rather than a genuinely boiling engine.',
  },
  P0119: {
    title: 'Engine coolant temperature circuit intermittent',
    brief:
      'The coolant temperature reading jumps in steps no real engine could follow. A corroded connector or a cracked sensor body.',
  },
  P0120: {
    title: 'Throttle or pedal position sensor A circuit malfunction',
    brief:
      'The first of the two position tracks in the throttle or accelerator pedal sensor is not giving a usable signal. Most cars drop to a reduced-power mode when this happens.',
  },
  P0121: {
    title: 'Throttle or pedal position sensor A range/performance',
    brief:
      'The throttle position signal is readable but does not agree with the air flow, the manifold pressure, or its second track. A worn track inside the sensor, or a throttle plate coked up so it cannot reach its rest stop.',
  },
  P0122: {
    title: 'Throttle or pedal position sensor A circuit low',
    brief:
      'The throttle position signal is below its legal minimum — a short to ground, or the 5V supply to the sensor has been lost.',
  },
  P0123: {
    title: 'Throttle or pedal position sensor A circuit high',
    brief:
      'The throttle position signal is above its legal maximum, reporting more opening than the throttle has. Normally a short to voltage or a lost sensor ground.',
  },
  P0124: {
    title: 'Throttle or pedal position sensor A circuit intermittent',
    brief:
      'The throttle position signal drops out momentarily. A worn spot in the sensor track, or a connector losing contact as the engine rocks.',
  },
  P0125: {
    title: 'Coolant temperature too low for closed loop fuel control',
    brief:
      'The engine did not reach operating temperature in the time allowed, so the computer never handed fuelling over to the oxygen sensors. A stuck-open thermostat is the common cause.',
  },
  P0126: {
    title: 'Coolant temperature too low for stable operation',
    brief:
      'The engine is running, but colder than it should be for steady idle and normal fuelling. Again usually a thermostat stuck open, or a coolant sensor reading low.',
  },
  P0127: {
    title: 'Intake air temperature too high',
    brief:
      'The air reaching the engine is hotter than expected. A recirculating hot-air leak into the intake, a blocked intercooler, or a sensor reading high.',
  },
  P0128: {
    title: 'Coolant thermostat below regulating temperature',
    brief:
      'The engine warmed up, but never got as hot as the thermostat should hold it. The thermostat is stuck part-open, so the engine runs cold, uses more fuel and heats the cabin poorly.',
  },
  P0129: {
    title: 'Barometric pressure too low',
    brief:
      'The barometric sensor is reporting an air pressure below anything found at road altitude. The sensor has drifted, or it is reading manifold vacuum through a mis-routed hose.',
  },

  // ── Oxygen sensors, P0130–P0167 ─────────────────────────────────────────
  P0130: {
    title: 'Oxygen sensor circuit malfunction, bank 1 sensor 1',
    brief:
      'The upstream oxygen sensor on bank 1 is not producing a signal the computer can work with. This is the sensor fuelling is corrected from, so the engine falls back to open loop.',
  },
  P0131: {
    title: 'Oxygen sensor circuit low voltage, bank 1 sensor 1',
    brief:
      'Bank 1’s upstream oxygen sensor is holding a low voltage, which reads as a permanently lean exhaust. Either the mixture really is lean, or the signal wire is shorted to ground.',
  },
  P0132: {
    title: 'Oxygen sensor circuit high voltage, bank 1 sensor 1',
    brief:
      'Bank 1’s upstream oxygen sensor is holding a high voltage, which reads as a permanently rich exhaust. A genuinely rich mixture, a leaking injector, or a shorted signal wire.',
  },
  P0133: {
    title: 'Oxygen sensor circuit slow response, bank 1 sensor 1',
    brief:
      'The upstream sensor on bank 1 still swings, but too lazily. An aged sensor coated by oil or silicone is the usual answer, and it costs fuel long before it sets any other code.',
  },
  P0134: {
    title: 'Oxygen sensor no activity detected, bank 1 sensor 1',
    brief:
      'Bank 1’s upstream oxygen sensor is not moving at all — a flat line rather than a wrong value. A dead sensor, a broken wire, or a heater that never brought it up to temperature.',
  },
  P0135: {
    title: 'Oxygen sensor heater circuit malfunction, bank 1 sensor 1',
    brief:
      'The heater element inside bank 1’s upstream oxygen sensor is not drawing normal current, so the sensor takes far too long to start working after a cold start.',
  },
  P0136: {
    title: 'Oxygen sensor circuit malfunction, bank 1 sensor 2',
    brief:
      'The oxygen sensor after the bank 1 catalytic converter is not giving a usable signal. It grades the converter rather than setting fuelling.',
  },
  P0137: {
    title: 'Oxygen sensor circuit low voltage, bank 1 sensor 2',
    brief:
      'The sensor behind the bank 1 converter is stuck low. Either an exhaust leak is drawing fresh air past it, or its signal wire is shorted to ground.',
  },
  P0138: {
    title: 'Oxygen sensor circuit high voltage, bank 1 sensor 2',
    brief:
      'The sensor behind the bank 1 converter is stuck high. A genuinely rich exhaust, contamination on the sensor tip, or a short to voltage in the wiring.',
  },
  P0139: {
    title: 'Oxygen sensor circuit slow response, bank 1 sensor 2',
    brief:
      'The sensor behind the bank 1 converter reacts too slowly to a deliberate fuelling change the computer made to test it. The sensor has aged.',
  },
  P0140: {
    title: 'Oxygen sensor no activity detected, bank 1 sensor 2',
    brief:
      'The sensor behind the bank 1 converter is not responding at all. A dead sensor or a broken connection — note that a perfectly working converter also produces a very flat trace.',
  },
  P0141: {
    title: 'Oxygen sensor heater circuit malfunction, bank 1 sensor 2',
    brief:
      'The heater in the sensor behind the bank 1 converter is not drawing its normal current. Check the fuse: one fuse often feeds several sensor heaters.',
  },
  P0142: {
    title: 'Oxygen sensor circuit malfunction, bank 1 sensor 3',
    brief:
      'The third oxygen sensor on bank 1, fitted after a second converter, is not producing a usable signal.',
  },
  P0143: {
    title: 'Oxygen sensor circuit low voltage, bank 1 sensor 3',
    brief:
      'The third sensor on bank 1 is holding low, which reads as oxygen-rich exhaust. An exhaust leak ahead of it, or a shorted signal wire.',
  },
  P0144: {
    title: 'Oxygen sensor circuit high voltage, bank 1 sensor 3',
    brief:
      'The third sensor on bank 1 is holding high, reading as a rich exhaust throughout. Contamination or a short to voltage.',
  },
  P0145: {
    title: 'Oxygen sensor circuit slow response, bank 1 sensor 3',
    brief:
      'The third sensor on bank 1 responds, but too slowly to the mixture changes the computer commanded. An aged sensor.',
  },
  P0146: {
    title: 'Oxygen sensor no activity detected, bank 1 sensor 3',
    brief:
      'The third sensor on bank 1 shows no movement at all — dead sensor, broken wire, or a heater that never warmed it.',
  },
  P0147: {
    title: 'Oxygen sensor heater circuit malfunction, bank 1 sensor 3',
    brief:
      'The heater in the third bank 1 oxygen sensor is not drawing its normal current. Usually the element itself, or the fuse feeding it.',
  },
  P0150: {
    title: 'Oxygen sensor circuit malfunction, bank 2 sensor 1',
    brief:
      'The upstream oxygen sensor on bank 2 is not producing a usable signal, so that half of the engine has no measured feedback for its fuelling.',
  },
  P0151: {
    title: 'Oxygen sensor circuit low voltage, bank 2 sensor 1',
    brief:
      'Bank 2’s upstream oxygen sensor is held low, reading permanently lean. Either that bank really is lean, or the signal wire is shorted to ground.',
  },
  P0152: {
    title: 'Oxygen sensor circuit high voltage, bank 2 sensor 1',
    brief:
      'Bank 2’s upstream oxygen sensor is held high, reading permanently rich — a leaking injector on that bank, or a shorted signal wire.',
  },
  P0153: {
    title: 'Oxygen sensor circuit slow response, bank 2 sensor 1',
    brief:
      'Bank 2’s upstream sensor still switches but too slowly to keep fuelling accurate. The sensor has aged or is contaminated.',
  },
  P0154: {
    title: 'Oxygen sensor no activity detected, bank 2 sensor 1',
    brief:
      'Bank 2’s upstream oxygen sensor is flat — no movement at all. A dead sensor, a broken wire, or a heater fault keeping it cold.',
  },
  P0155: {
    title: 'Oxygen sensor heater circuit malfunction, bank 2 sensor 1',
    brief:
      'The heater inside bank 2’s upstream oxygen sensor is not drawing normal current, so that bank stays in open loop far longer than it should.',
  },
  P0156: {
    title: 'Oxygen sensor circuit malfunction, bank 2 sensor 2',
    brief:
      'The oxygen sensor behind the bank 2 catalytic converter is not giving a usable signal, so that converter cannot be graded.',
  },
  P0157: {
    title: 'Oxygen sensor circuit low voltage, bank 2 sensor 2',
    brief:
      'The sensor behind the bank 2 converter is held low. An exhaust leak drawing air in ahead of it, or a short to ground.',
  },
  P0158: {
    title: 'Oxygen sensor circuit high voltage, bank 2 sensor 2',
    brief:
      'The sensor behind the bank 2 converter is held high — a rich exhaust, a contaminated sensor, or a short to voltage.',
  },
  P0159: {
    title: 'Oxygen sensor circuit slow response, bank 2 sensor 2',
    brief:
      'The sensor behind the bank 2 converter reacts too slowly to the deliberate fuelling change used to test it.',
  },
  P0160: {
    title: 'Oxygen sensor no activity detected, bank 2 sensor 2',
    brief:
      'The sensor behind the bank 2 converter shows no activity at all — dead sensor, broken connection, or a failed heater.',
  },
  P0161: {
    title: 'Oxygen sensor heater circuit malfunction, bank 2 sensor 2',
    brief:
      'The heater in the sensor behind the bank 2 converter is not drawing normal current. Check the shared heater fuse first.',
  },
  P0162: {
    title: 'Oxygen sensor circuit malfunction, bank 2 sensor 3',
    brief:
      'The third oxygen sensor on bank 2, after a second converter, is not producing a usable signal.',
  },
  P0163: {
    title: 'Oxygen sensor circuit low voltage, bank 2 sensor 3',
    brief:
      'The third sensor on bank 2 is stuck low, reading as oxygen-rich exhaust — an upstream exhaust leak or a shorted wire.',
  },
  P0164: {
    title: 'Oxygen sensor circuit high voltage, bank 2 sensor 3',
    brief:
      'The third sensor on bank 2 is stuck high, reading rich throughout. Contamination or a short to voltage.',
  },
  P0165: {
    title: 'Oxygen sensor circuit slow response, bank 2 sensor 3',
    brief:
      'The third sensor on bank 2 still moves but too slowly to be trusted. An aged sensor.',
  },
  P0166: {
    title: 'Oxygen sensor no activity detected, bank 2 sensor 3',
    brief:
      'The third sensor on bank 2 is not moving at all — dead sensor, broken wire, or a heater that never warmed it.',
  },
  P0167: {
    title: 'Oxygen sensor heater circuit malfunction, bank 2 sensor 3',
    brief:
      'The heater in the third bank 2 oxygen sensor is not drawing normal current, most often a failed element or its fuse.',
  },

  // ── Fuel trim, P0170–P0179 ──────────────────────────────────────────────
  P0170: {
    title: 'Fuel trim malfunction, bank 1',
    brief:
      'The corrections the computer applies to bank 1’s fuelling have run past the limit it is allowed. It is no longer able to hold the mixture where it wants it, in either direction.',
  },
  P0171: {
    title: 'System too lean, bank 1',
    brief:
      'Bank 1 is short of fuel for the air it is getting, and the computer has run out of extra fuel to add. Unmetered air is getting in past the air flow meter, or fuel delivery is falling short.',
  },
  P0172: {
    title: 'System too rich, bank 1',
    brief:
      'Bank 1 has more fuel than the air needs, and the computer has run out of fuel it is allowed to take away. Leaking injectors, too much fuel pressure, or an air flow meter over-reading.',
  },
  P0173: {
    title: 'Fuel trim malfunction, bank 2',
    brief:
      'Bank 2’s fuel corrections have reached the limit the computer is allowed to apply, so the mixture on that bank can no longer be held correct.',
  },
  P0174: {
    title: 'System too lean, bank 2',
    brief:
      'Bank 2 is running short of fuel for the air it is receiving. If bank 1 is lean too, look for a shared cause — air flow meter, fuel pressure or a manifold leak — rather than one bank’s injectors.',
  },
  P0175: {
    title: 'System too rich, bank 2',
    brief:
      'Bank 2 has more fuel than it needs and the computer cannot trim any further out. Leaking injectors on that bank, or excess fuel pressure shared by both.',
  },
  P0176: {
    title: 'Fuel composition sensor circuit malfunction',
    brief:
      'The sensor that measures how much ethanol is in the fuel is not reporting. On a flex-fuel car the computer then assumes a default blend.',
  },
  P0177: {
    title: 'Fuel composition sensor range/performance',
    brief:
      'The ethanol content reading is possible but does not match how the engine is actually behaving after a refill.',
  },
  P0178: {
    title: 'Fuel composition sensor circuit low input',
    brief:
      'The fuel composition signal is below its valid range — a short to ground or a broken signal wire.',
  },
  P0179: {
    title: 'Fuel composition sensor circuit high input',
    brief:
      'The fuel composition signal is above its valid range, normally an open circuit or a short to voltage.',
  },

  // ── Fuel temperature and rail pressure, P0180–P0199 ─────────────────────
  P0180: {
    title: 'Fuel temperature sensor A circuit malfunction',
    brief:
      'The sensor measuring fuel temperature is giving no usable signal. Fuel temperature affects its density, so injection quantity is corrected from it.',
  },
  P0181: {
    title: 'Fuel temperature sensor A range/performance',
    brief:
      'Fuel temperature is a believable number but the wrong one — it does not track the engine or ambient sensors as fuel warms.',
  },
  P0182: {
    title: 'Fuel temperature sensor A circuit low input',
    brief:
      'The fuel temperature signal is pinned at the cold end of its range, normally a short to ground.',
  },
  P0183: {
    title: 'Fuel temperature sensor A circuit high input',
    brief:
      'The fuel temperature signal is pinned at the hot end of its range, normally an open circuit or a disconnected plug.',
  },
  P0184: {
    title: 'Fuel temperature sensor A circuit intermittent',
    brief:
      'The fuel temperature reading drops out and returns — a loose connector or a wire broken inside its insulation.',
  },
  P0185: {
    title: 'Fuel temperature sensor B circuit malfunction',
    brief:
      'The second fuel temperature sensor, usually in the return line or the tank, is not giving a usable signal.',
  },
  P0186: {
    title: 'Fuel temperature sensor B range/performance',
    brief:
      'The second fuel temperature sensor reads plausibly but disagrees with the first one under conditions where they should match.',
  },
  P0187: {
    title: 'Fuel temperature sensor B circuit low input',
    brief:
      'The second fuel temperature signal is at the bottom of its range — a short to ground in the sensor or its wiring.',
  },
  P0188: {
    title: 'Fuel temperature sensor B circuit high input',
    brief:
      'The second fuel temperature signal is at the top of its range, which on these sensors means an open circuit.',
  },
  P0189: {
    title: 'Fuel temperature sensor B circuit intermittent',
    brief:
      'The second fuel temperature reading cuts in and out, pointing at a connection rather than the sensor.',
  },
  P0190: {
    title: 'Fuel rail pressure sensor circuit malfunction',
    brief:
      'The sensor on the fuel rail is not reporting. Without it the computer cannot regulate injection pressure and normally limits power heavily.',
  },
  P0191: {
    title: 'Fuel rail pressure sensor range/performance',
    brief:
      'Rail pressure is being reported, but it does not match what the pump was commanded to deliver. A drifting sensor, or a pump and regulator no longer holding pressure.',
  },
  P0192: {
    title: 'Fuel rail pressure sensor circuit low input',
    brief:
      'The rail pressure signal is below its valid range — a short to ground, a lost supply voltage, or a disconnected plug.',
  },
  P0193: {
    title: 'Fuel rail pressure sensor circuit high input',
    brief:
      'The rail pressure signal is above its valid range, more than the sensor could produce. Usually a short to voltage or a lost ground.',
  },
  P0194: {
    title: 'Fuel rail pressure sensor circuit intermittent',
    brief:
      'The rail pressure signal jumps in a way real pressure cannot follow. A connector or a chafed wire rather than the sensor.',
  },
  P0195: {
    title: 'Engine oil temperature sensor malfunction',
    brief:
      'The oil temperature sensor is not giving a usable signal. Valve timing and some cooling decisions are made from oil temperature.',
  },
  P0196: {
    title: 'Engine oil temperature sensor range/performance',
    brief:
      'Oil temperature reads plausibly but does not agree with coolant temperature under conditions where the two should be close.',
  },
  P0197: {
    title: 'Engine oil temperature sensor low',
    brief:
      'The oil temperature signal is at the bottom of its range, reporting a temperature the oil cannot be at. Normally a short to ground.',
  },
  P0198: {
    title: 'Engine oil temperature sensor high',
    brief:
      'The oil temperature signal is at the top of its range, which on these sensors means an open circuit rather than genuinely hot oil.',
  },
  P0199: {
    title: 'Engine oil temperature sensor intermittent',
    brief:
      'The oil temperature reading cuts in and out — a connector or a broken wire rather than the sensor element.',
  },
};
