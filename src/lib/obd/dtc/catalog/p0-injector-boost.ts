import type { CatalogEntry } from '../types';

/** P0200–P02FF: injector circuits, cylinder balance, throttle B/C, boost. */
export const INJECTOR_BOOST: Record<string, CatalogEntry> = {
  // ── Injector circuits, P0200–P0212 ──────────────────────────────────────
  P0200: {
    title: 'Injector circuit malfunction',
    brief:
      'The computer cannot drive the injectors correctly, without being able to say which one. A shared supply feed, a ground, or the driver stage inside the computer itself.',
  },
  P0201: {
    title: 'Injector circuit malfunction, cylinder 1',
    brief:
      'The electrical circuit to cylinder 1’s injector is open or shorted. This is about the wiring and the coil in the injector, not about how that cylinder is burning.',
  },
  P0202: {
    title: 'Injector circuit malfunction, cylinder 2',
    brief:
      'Cylinder 2’s injector circuit is open or shorted, so the computer cannot switch that injector as commanded.',
  },
  P0203: {
    title: 'Injector circuit malfunction, cylinder 3',
    brief:
      'Cylinder 3’s injector circuit is open or shorted — the injector coil, its connector, or the wire back to the computer.',
  },
  P0204: {
    title: 'Injector circuit malfunction, cylinder 4',
    brief:
      'Cylinder 4’s injector circuit is open or shorted, so that injector is not being driven properly.',
  },
  P0205: {
    title: 'Injector circuit malfunction, cylinder 5',
    brief: 'Cylinder 5’s injector circuit is open or shorted at the injector, the plug, or the harness.',
  },
  P0206: {
    title: 'Injector circuit malfunction, cylinder 6',
    brief: 'Cylinder 6’s injector circuit is open or shorted at the injector, the plug, or the harness.',
  },
  P0207: {
    title: 'Injector circuit malfunction, cylinder 7',
    brief: 'Cylinder 7’s injector circuit is open or shorted at the injector, the plug, or the harness.',
  },
  P0208: {
    title: 'Injector circuit malfunction, cylinder 8',
    brief: 'Cylinder 8’s injector circuit is open or shorted at the injector, the plug, or the harness.',
  },
  P0209: {
    title: 'Injector circuit malfunction, cylinder 9',
    brief: 'Cylinder 9’s injector circuit is open or shorted at the injector, the plug, or the harness.',
  },
  P0210: {
    title: 'Injector circuit malfunction, cylinder 10',
    brief: 'Cylinder 10’s injector circuit is open or shorted at the injector, the plug, or the harness.',
  },
  P0211: {
    title: 'Injector circuit malfunction, cylinder 11',
    brief: 'Cylinder 11’s injector circuit is open or shorted at the injector, the plug, or the harness.',
  },
  P0212: {
    title: 'Injector circuit malfunction, cylinder 12',
    brief: 'Cylinder 12’s injector circuit is open or shorted at the injector, the plug, or the harness.',
  },
  P0213: {
    title: 'Cold start injector 1 malfunction',
    brief:
      'The extra injector used only to help a cold engine start is not responding electrically. You would notice it only on a cold morning.',
  },
  P0214: {
    title: 'Cold start injector 2 malfunction',
    brief:
      'The second cold-start injector is not responding electrically. Like the first, it plays no part once the engine is warm.',
  },
  P0215: {
    title: 'Engine shutoff solenoid malfunction',
    brief:
      'The solenoid that cuts fuel to stop a diesel engine is not answering. In the worst case the engine keeps running after the key is turned off.',
  },
  P0216: {
    title: 'Injection timing control circuit malfunction',
    brief:
      'The computer cannot control when injection happens relative to the piston. A diesel timing control valve or its wiring.',
  },

  // ── Protection events, P0217–P0219 ──────────────────────────────────────
  P0217: {
    title: 'Engine over temperature condition',
    brief:
      'The engine has actually overheated — this is a record that coolant temperature went past the safe limit, not a sensor complaint. Look for lost coolant, a dead fan, or a stuck thermostat.',
    risk: {
      severity: 'critical',
      drive: 'stop-now',
      note: 'An overheating engine warps heads and destroys head gaskets within minutes. Stop, let it cool, and check the coolant level before going anywhere.',
    },
  },
  P0218: {
    title: 'Transmission over temperature condition',
    brief:
      'Automatic transmission fluid has been hotter than its safe limit. Towing, a blocked cooler, low fluid, or a torque converter slipping and generating heat.',
    risk: {
      severity: 'serious',
      drive: 'limp-to-shop',
      note: 'Overheated fluid ages in minutes and takes the clutches with it. Stop towing, let it cool, and get the fluid and cooler checked.',
    },
  },
  P0219: {
    title: 'Engine overspeed condition',
    brief:
      'The engine was turned faster than its rev limit — nearly always a missed downshift in a manual car. It is a stored record of an event, not a fault present now.',
  },

  // ── Throttle and pedal sensors B and C, P0220–P0229 ─────────────────────
  P0220: {
    title: 'Throttle or pedal position sensor B circuit malfunction',
    brief:
      'The second position track in the throttle body or accelerator pedal is not reporting. Two tracks exist so each can check the other; with one gone the car normally limits power.',
  },
  P0221: {
    title: 'Throttle or pedal position sensor B range/performance',
    brief:
      'The second position track reads plausibly but does not agree with the first one across the travel. A worn sensor track, or a pedal assembly that has been strained.',
  },
  P0222: {
    title: 'Throttle or pedal position sensor B circuit low',
    brief: 'The second throttle or pedal track is below its valid range — a short to ground or a lost 5V supply.',
  },
  P0223: {
    title: 'Throttle or pedal position sensor B circuit high',
    brief: 'The second throttle or pedal track is above its valid range — a short to voltage or a lost ground.',
  },
  P0224: {
    title: 'Throttle or pedal position sensor B circuit intermittent',
    brief:
      'The second throttle or pedal track drops out momentarily. A worn spot in the track, or a connector losing contact.',
  },
  P0225: {
    title: 'Throttle or pedal position sensor C circuit malfunction',
    brief:
      'A third position track, fitted on cars that use three for redundancy, is not reporting at all.',
  },
  P0226: {
    title: 'Throttle or pedal position sensor C range/performance',
    brief:
      'The third position track reads plausibly but disagrees with the other two across the travel.',
  },
  P0227: {
    title: 'Throttle or pedal position sensor C circuit low',
    brief: 'The third throttle or pedal track is below its valid range — a short to ground or a lost supply.',
  },
  P0228: {
    title: 'Throttle or pedal position sensor C circuit high',
    brief: 'The third throttle or pedal track is above its valid range — a short to voltage or a lost ground.',
  },
  P0229: {
    title: 'Throttle or pedal position sensor C circuit intermittent',
    brief: 'The third throttle or pedal track cuts in and out, pointing at a connector or a worn track.',
  },

  // ── Fuel pump circuits, P0230–P0233 ─────────────────────────────────────
  P0230: {
    title: 'Fuel pump primary circuit malfunction',
    brief:
      'The circuit that tells the fuel pump relay to close is faulty. If the pump never runs the engine will not start at all.',
  },
  P0231: {
    title: 'Fuel pump secondary circuit low',
    brief:
      'The wire feeding the fuel pump is at a lower voltage than it should be with the pump commanded on — a corroded connector, a bad relay contact, or a pump drawing too much current.',
  },
  P0232: {
    title: 'Fuel pump secondary circuit high',
    brief:
      'Voltage is present on the fuel pump feed when the pump should be off, which normally means a relay with welded contacts.',
  },
  P0233: {
    title: 'Fuel pump secondary circuit intermittent',
    brief:
      'The fuel pump feed cuts in and out. A relay on its way out or a corroded connector, and a common cause of a car that stalls and then restarts.',
  },

  // ── Boost control, P0234–P0249 ──────────────────────────────────────────
  P0234: {
    title: 'Engine overboost condition',
    brief:
      'The turbo produced more boost than the computer allowed. A wastegate that will not open, a stuck actuator, a split control hose, or a boost solenoid failing to bleed pressure.',
    risk: {
      severity: 'serious',
      drive: 'limp-to-shop',
      note: 'Uncontrolled boost overloads pistons and head gaskets. Most cars cut power to protect themselves — do not drive around that by keeping your foot in.',
    },
  },
  P0235: {
    title: 'Turbocharger boost sensor A circuit',
    brief:
      'The boost pressure sensor is not giving a usable signal, so the computer cannot regulate the turbo and normally limits it to a safe minimum.',
  },
  P0236: {
    title: 'Turbocharger boost sensor A range/performance',
    brief:
      'Boost pressure is being reported, but it does not match what the wastegate was commanded to do. A drifting sensor, a blocked sensing hose, or a genuine boost leak.',
  },
  P0237: {
    title: 'Turbocharger boost sensor A circuit low',
    brief: 'The boost sensor signal is below its valid range — a short to ground, a broken wire, or a lost supply.',
  },
  P0238: {
    title: 'Turbocharger boost sensor A circuit high',
    brief: 'The boost sensor signal is above its valid range, higher than the sensor can genuinely produce.',
  },
  P0243: {
    title: 'Turbocharger wastegate solenoid A',
    brief:
      'The solenoid that bleeds pressure to control the wastegate is not answering electrically. Boost then defaults to whatever the spring alone gives.',
  },
  P0245: {
    title: 'Turbocharger wastegate solenoid A low',
    brief: 'The wastegate control solenoid circuit is shorted to ground, so it is held on when it should not be.',
  },
  P0246: {
    title: 'Turbocharger wastegate solenoid A high',
    brief: 'The wastegate control solenoid circuit is open or shorted to voltage, so it never energises.',
  },
  P0247: {
    title: 'Turbocharger wastegate solenoid B',
    brief:
      'The second wastegate control solenoid, on a twin-turbo or two-stage system, is not answering electrically.',
  },
  P0251: {
    title: 'Injection pump fuel metering control A malfunction',
    brief:
      'The mechanism that meters how much fuel the injection pump delivers is not doing what it was told. A diesel pump control valve, its wiring, or the pump itself.',
  },
  P0252: {
    title: 'Injection pump fuel metering control A range/performance',
    brief:
      'The injection pump responds but delivers the wrong quantity for the command. Wear in the pump, or a control valve that is sticking.',
  },

  // ── Per-cylinder injector drive and balance, P0261–P0284 ────────────────
  P0261: {
    title: 'Cylinder 1 injector circuit low',
    brief:
      'Cylinder 1’s injector control wire is shorted to ground, so the injector is held open longer than commanded or is on constantly.',
  },
  P0262: {
    title: 'Cylinder 1 injector circuit high',
    brief:
      'Cylinder 1’s injector circuit is open or shorted to voltage — no current reaches the injector, so that cylinder gets no fuel.',
  },
  P0263: {
    title: 'Cylinder 1 contribution or balance fault',
    brief:
      'Cylinder 1 is not pulling its weight. The computer times how much each cylinder accelerates the crankshaft and this one is out of line — a worn injector, low compression, or a valve not sealing.',
  },
  P0264: {
    title: 'Cylinder 2 injector circuit low',
    brief: 'Cylinder 2’s injector control wire is shorted to ground, holding the injector open too long.',
  },
  P0265: {
    title: 'Cylinder 2 injector circuit high',
    brief: 'Cylinder 2’s injector circuit is open or shorted to voltage, so no fuel is delivered there.',
  },
  P0266: {
    title: 'Cylinder 2 contribution or balance fault',
    brief:
      'Cylinder 2 contributes less crankshaft acceleration than the others. A tired injector, low compression, or a leaking valve.',
  },
  P0267: {
    title: 'Cylinder 3 injector circuit low',
    brief: 'Cylinder 3’s injector control wire is shorted to ground, holding the injector open too long.',
  },
  P0268: {
    title: 'Cylinder 3 injector circuit high',
    brief: 'Cylinder 3’s injector circuit is open or shorted to voltage, so no fuel is delivered there.',
  },
  P0269: {
    title: 'Cylinder 3 contribution or balance fault',
    brief:
      'Cylinder 3 is producing less than the rest. Injector wear, low compression, or a valve not sealing.',
  },
  P0270: {
    title: 'Cylinder 4 injector circuit low',
    brief: 'Cylinder 4’s injector control wire is shorted to ground, holding the injector open too long.',
  },
  P0271: {
    title: 'Cylinder 4 injector circuit high',
    brief: 'Cylinder 4’s injector circuit is open or shorted to voltage, so no fuel is delivered there.',
  },
  P0272: {
    title: 'Cylinder 4 contribution or balance fault',
    brief:
      'Cylinder 4 is producing less than the rest. Injector wear, low compression, or a valve not sealing.',
  },
  P0273: {
    title: 'Cylinder 5 injector circuit low',
    brief: 'Cylinder 5’s injector control wire is shorted to ground, holding the injector open too long.',
  },
  P0274: {
    title: 'Cylinder 5 injector circuit high',
    brief: 'Cylinder 5’s injector circuit is open or shorted to voltage, so no fuel is delivered there.',
  },
  P0275: {
    title: 'Cylinder 5 contribution or balance fault',
    brief:
      'Cylinder 5 is producing less than the rest. Injector wear, low compression, or a valve not sealing.',
  },
  P0276: {
    title: 'Cylinder 6 injector circuit low',
    brief: 'Cylinder 6’s injector control wire is shorted to ground, holding the injector open too long.',
  },
  P0277: {
    title: 'Cylinder 6 injector circuit high',
    brief: 'Cylinder 6’s injector circuit is open or shorted to voltage, so no fuel is delivered there.',
  },
  P0278: {
    title: 'Cylinder 6 contribution or balance fault',
    brief:
      'Cylinder 6 is producing less than the rest. Injector wear, low compression, or a valve not sealing.',
  },
  P0279: {
    title: 'Cylinder 7 injector circuit low',
    brief: 'Cylinder 7’s injector control wire is shorted to ground, holding the injector open too long.',
  },
  P0280: {
    title: 'Cylinder 7 injector circuit high',
    brief: 'Cylinder 7’s injector circuit is open or shorted to voltage, so no fuel is delivered there.',
  },
  P0281: {
    title: 'Cylinder 7 contribution or balance fault',
    brief:
      'Cylinder 7 is producing less than the rest. Injector wear, low compression, or a valve not sealing.',
  },
  P0282: {
    title: 'Cylinder 8 injector circuit low',
    brief: 'Cylinder 8’s injector control wire is shorted to ground, holding the injector open too long.',
  },
  P0283: {
    title: 'Cylinder 8 injector circuit high',
    brief: 'Cylinder 8’s injector circuit is open or shorted to voltage, so no fuel is delivered there.',
  },
  P0284: {
    title: 'Cylinder 8 contribution or balance fault',
    brief:
      'Cylinder 8 is producing less than the rest. Injector wear, low compression, or a valve not sealing.',
  },

  P0299: {
    title: 'Turbocharger or supercharger underboost',
    brief:
      'The turbo is producing less boost than commanded. A split boost hose or intercooler pipe, a leaking wastegate, sticking variable-vane linkage, or a blocked air filter.',
  },
};
