import type { CatalogEntry } from '../types';

import { CHARGING_RISK, FAN_RISK } from './risks';

/** P0600–P06FF: the engine computer's own health and its output circuits. */
export const MODULE: Record<string, CatalogEntry> = {
  // ── Internal checks, P0600–P0611 ────────────────────────────────────────
  P0600: {
    title: 'Serial communication link malfunction',
    brief:
      'The engine computer cannot talk to another module it expects to hear from. Look for network codes from the other modules as well before suspecting this one.',
  },
  P0601: {
    title: 'Internal control module memory checksum error',
    brief:
      'The computer checked its own program memory against a stored checksum and they no longer match. Corrupted software, usually after a failed update or a voltage drop mid-programming.',
  },
  P0602: {
    title: 'Control module programming error',
    brief:
      'The computer is running software that was never finished or fully written. It normally follows an interrupted reflash rather than appearing on its own.',
  },
  P0603: {
    title: 'Internal control module keep-alive memory error',
    brief:
      'The memory that survives with the ignition off has lost its contents. Learned fuel trims and idle settings are gone, so the engine may run oddly until it relearns them. A weak battery or a bad earth is the usual cause.',
  },
  P0604: {
    title: 'Internal control module random access memory error',
    brief:
      'The computer’s working memory failed its self-test. Unlike the learned-values memory, this one points at genuinely faulty hardware.',
  },
  P0605: {
    title: 'Internal control module read-only memory error',
    brief: 'The computer’s program storage failed its self-test — corrupted software or a failing memory chip.',
  },
  P0606: {
    title: 'Engine control module processor fault',
    brief:
      'The processor failed one of its own watchdog checks. The computer no longer trusts itself, so the car usually drops into reduced power.',
  },
  P0607: {
    title: 'Control module performance',
    brief:
      'The computer is running, but one of its internal monitoring circuits does not agree with the others. Often stored alongside a low-voltage or bad-earth fault.',
  },
  P0608: {
    title: 'Control module vehicle speed output A malfunction',
    brief: 'The road speed signal the computer sends out to other modules is not being produced correctly.',
  },
  P0609: {
    title: 'Control module vehicle speed output B malfunction',
    brief: 'The second road speed output from the computer is not being produced correctly.',
  },
  P0610: {
    title: 'Control module vehicle options error',
    brief:
      'The computer’s configuration does not match the car it is fitted to — a second-hand module, or one that was never coded after replacement.',
  },
  P0611: {
    title: 'Fuel injector control module performance',
    brief:
      'The separate module that drives the injectors on some diesels is not performing as expected, though it is still communicating.',
  },

  // ── Starter and charging outputs, P0615–P0629 ───────────────────────────
  P0615: {
    title: 'Starter relay circuit malfunction',
    brief: 'The circuit that energises the starter relay is faulty, which can leave the engine refusing to crank.',
  },
  P0616: {
    title: 'Starter relay circuit low',
    brief: 'The starter relay control wire is shorted to ground, so the starter may engage when it should not.',
  },
  P0617: {
    title: 'Starter relay circuit high',
    brief: 'The starter relay control circuit is open or shorted to voltage, so the relay never pulls in.',
  },
  P0620: {
    title: 'Generator control circuit malfunction',
    brief:
      'The computer cannot control the alternator’s output. On modern cars charging voltage is commanded rather than fixed, so this is a real charging fault.',
    risk: CHARGING_RISK,
  },
  P0621: {
    title: 'Generator lamp L terminal circuit malfunction',
    brief:
      'The terminal that both drives the battery warning lamp and excites the alternator is faulty. A dead lamp bulb alone can stop some alternators charging at all.',
    risk: CHARGING_RISK,
  },
  P0622: {
    title: 'Generator field F terminal circuit malfunction',
    brief:
      'The wire that controls the alternator’s field winding — how hard it is being asked to charge — is open or shorted.',
    risk: CHARGING_RISK,
  },
  P0623: {
    title: 'Generator lamp control circuit malfunction',
    brief: 'The circuit driving the battery warning lamp is faulty, so the lamp may not warn you when charging stops.',
  },
  P0625: {
    title: 'Generator field terminal circuit low',
    brief:
      'The alternator field control wire is shorted to ground, so the alternator is driven to full output regardless of what the computer asks for.',
    risk: CHARGING_RISK,
  },
  P0626: {
    title: 'Generator field terminal circuit high',
    brief: 'The alternator field control circuit is open or shorted to voltage.',
    risk: CHARGING_RISK,
  },
  P0627: {
    title: 'Fuel pump A control circuit open',
    brief:
      'The circuit that commands the fuel pump is open — a broken wire, a failed relay coil, or a disconnected plug.',
  },
  P0628: {
    title: 'Fuel pump A control circuit low',
    brief: 'The fuel pump control wire is shorted to ground, so the pump may run whenever the ignition is on.',
  },
  P0629: {
    title: 'Fuel pump A control circuit high',
    brief: 'The fuel pump control circuit is shorted to voltage or open, so the pump cannot be commanded.',
  },

  // ── Programming and identity, P0630–P0638 ───────────────────────────────
  P0630: {
    title: 'VIN not programmed or incompatible',
    brief:
      'The computer has no vehicle identification number stored, or one that does not match the rest of the car. A replacement module that was never coded.',
  },
  P0631: {
    title: 'VIN not programmed in the transmission control module',
    brief: 'The transmission module has no vehicle identification number stored, normally after being replaced.',
  },
  P0632: {
    title: 'Odometer not programmed in the engine control module',
    brief: 'The computer has no mileage figure stored, which again points at a replacement module that was not coded.',
  },
  P0633: {
    title: 'Immobiliser key not programmed',
    brief:
      'The engine computer holds no key identity to compare against, so it will refuse to run the engine. The key or the module needs programming.',
  },
  P0634: {
    title: 'Control module internal temperature too high',
    brief:
      'The computer has measured itself running too hot. A module mounted somewhere hot, a failing internal driver, or a cooling problem around it.',
  },
  P0635: {
    title: 'Power steering control circuit',
    brief:
      'The circuit through which the computer controls electric power steering assistance is faulty. Steering gets heavier rather than failing outright.',
  },
  P0638: {
    title: 'Throttle actuator control range/performance, bank 1',
    brief:
      'The electronic throttle did not move to the commanded angle. Carbon holding the plate, a tired motor, or a return spring that has weakened.',
  },

  // ── Sensor reference voltage, P0641–P0653 ───────────────────────────────
  P0641: {
    title: 'Sensor reference voltage A circuit open',
    brief:
      'The 5V supply that feeds a whole group of sensors is missing. Expect several unrelated sensor codes at once — fix this one first, and the rest usually go with it.',
  },
  P0642: {
    title: 'Sensor reference voltage A circuit low',
    brief:
      'The shared 5V sensor supply is being pulled down, normally by one sensor or a chafed wire shorting it to ground.',
  },
  P0643: {
    title: 'Sensor reference voltage A circuit high',
    brief: 'The shared 5V sensor supply is above 5V, which means something is feeding battery voltage into it.',
  },
  P0645: {
    title: 'Air conditioning clutch relay control circuit',
    brief: 'The relay that engages the air conditioning compressor is not switching as commanded.',
  },
  P0646: {
    title: 'Air conditioning clutch relay control circuit low',
    brief: 'The air conditioning clutch relay control wire is shorted to ground.',
  },
  P0647: {
    title: 'Air conditioning clutch relay control circuit high',
    brief: 'The air conditioning clutch relay circuit is open or shorted to voltage, so the compressor never engages.',
  },
  P0650: {
    title: 'Malfunction indicator lamp control circuit',
    brief:
      'The circuit that lights the check engine lamp is faulty. It matters because the lamp may not come on for the next real fault.',
  },
  P0651: {
    title: 'Sensor reference voltage B circuit open',
    brief: 'The second shared 5V sensor supply is missing, taking another group of sensors offline with it.',
  },
  P0652: {
    title: 'Sensor reference voltage B circuit low',
    brief: 'The second shared 5V sensor supply is being pulled down by a short to ground.',
  },
  P0653: {
    title: 'Sensor reference voltage B circuit high',
    brief: 'The second shared 5V sensor supply is reading above 5V, so something is feeding voltage into it.',
  },
  P0654: {
    title: 'Engine speed output circuit malfunction',
    brief: 'The engine speed signal the computer sends out to the tachometer and other modules is not being produced.',
  },
  P0655: {
    title: 'Engine hot lamp output control circuit',
    brief: 'The circuit driving the engine temperature warning lamp is faulty, so it may not warn you of an overheat.',
  },

  // ── Glow plugs, P0670–P0683 ─────────────────────────────────────────────
  P0670: {
    title: 'Glow plug module control circuit',
    brief:
      'The control circuit for the glow plug module is faulty. Glow plugs only pre-heat a cold diesel, so a warm engine is unaffected.',
  },
  P0671: {
    title: 'Cylinder 1 glow plug circuit',
    brief: 'The glow plug circuit for cylinder 1 is open or shorted — a failed plug, or its supply strap.',
  },
  P0672: {
    title: 'Cylinder 2 glow plug circuit',
    brief: 'The glow plug circuit for cylinder 2 is open or shorted — a failed plug, or its supply strap.',
  },
  P0673: {
    title: 'Cylinder 3 glow plug circuit',
    brief: 'The glow plug circuit for cylinder 3 is open or shorted — a failed plug, or its supply strap.',
  },
  P0674: {
    title: 'Cylinder 4 glow plug circuit',
    brief: 'The glow plug circuit for cylinder 4 is open or shorted — a failed plug, or its supply strap.',
  },
  P0675: {
    title: 'Cylinder 5 glow plug circuit',
    brief: 'The glow plug circuit for cylinder 5 is open or shorted — a failed plug, or its supply strap.',
  },
  P0676: {
    title: 'Cylinder 6 glow plug circuit',
    brief: 'The glow plug circuit for cylinder 6 is open or shorted — a failed plug, or its supply strap.',
  },
  P0677: {
    title: 'Cylinder 7 glow plug circuit',
    brief: 'The glow plug circuit for cylinder 7 is open or shorted — a failed plug, or its supply strap.',
  },
  P0678: {
    title: 'Cylinder 8 glow plug circuit',
    brief: 'The glow plug circuit for cylinder 8 is open or shorted — a failed plug, or its supply strap.',
  },
  P0683: {
    title: 'Glow plug module to engine computer communication circuit',
    brief:
      'The glow plug module and the engine computer have stopped talking. The plugs may still work, but their status is no longer known.',
  },

  // ── Main relay and fans, P0685–P0694 ────────────────────────────────────
  P0685: {
    title: 'Engine computer power relay control circuit open',
    brief:
      'The circuit that holds the computer’s own main relay closed is open. This relay feeds the injectors, coils and sensors, so a fault here can stop the engine dead.',
  },
  P0686: {
    title: 'Engine computer power relay control circuit low',
    brief: 'The main relay control wire is shorted to ground, so the relay may stay energised with the key off.',
  },
  P0687: {
    title: 'Engine computer power relay control circuit high',
    brief: 'The main relay control circuit is open or shorted to voltage, so the relay never pulls in reliably.',
  },
  P0688: {
    title: 'Engine computer power relay sense circuit open',
    brief:
      'The computer commands its main relay but cannot see the resulting voltage come back. Worn relay contacts are the usual cause, and they cause intermittent stalling.',
  },
  P0691: {
    title: 'Cooling fan 1 control circuit low',
    brief: 'The first cooling fan control wire is shorted to ground, so the fan may run constantly or not at all.',
    risk: FAN_RISK,
  },
  P0692: {
    title: 'Cooling fan 1 control circuit high',
    brief: 'The first cooling fan control circuit is open or shorted to voltage, so the fan cannot be commanded on.',
    risk: FAN_RISK,
  },
  P0693: {
    title: 'Cooling fan 2 control circuit low',
    brief:
      'The second cooling fan control wire is shorted to ground, so the computer no longer decides when that fan runs.',
    risk: FAN_RISK,
  },
  P0694: {
    title: 'Cooling fan 2 control circuit high',
    brief: 'The second cooling fan control circuit is open or shorted to voltage, so that fan never runs.',
    risk: FAN_RISK,
  },
};
