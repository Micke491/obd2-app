import type { CatalogEntry } from '../types';

/** P0300–P03FF: misfire detection, knock, crank and cam sensors, coils. */
export const IGNITION: Record<string, CatalogEntry> = {
  // ── Misfire, P0300–P0316 ────────────────────────────────────────────────
  P0300: {
    title: 'Random or multiple cylinder misfire detected',
    brief:
      'More than one cylinder is misfiring, or the misfire keeps moving. That points at something the whole engine shares — an air leak, fuel supply, or timing — rather than one plug or coil.',
  },
  P0301: {
    title: 'Cylinder 1 misfire detected',
    brief:
      'Cylinder 1 is not burning its charge properly. The computer measures how much each power stroke accelerates the crankshaft, and this one keeps falling short.',
  },
  P0302: {
    title: 'Cylinder 2 misfire detected',
    brief: 'Cylinder 2 is not burning its charge properly — its power strokes are measurably weaker than the rest.',
  },
  P0303: {
    title: 'Cylinder 3 misfire detected',
    brief: 'Cylinder 3 is not burning its charge properly — its power strokes are measurably weaker than the rest.',
  },
  P0304: {
    title: 'Cylinder 4 misfire detected',
    brief: 'Cylinder 4 is not burning its charge properly — its power strokes are measurably weaker than the rest.',
  },
  P0305: {
    title: 'Cylinder 5 misfire detected',
    brief: 'Cylinder 5 is not burning its charge properly — its power strokes are measurably weaker than the rest.',
  },
  P0306: {
    title: 'Cylinder 6 misfire detected',
    brief: 'Cylinder 6 is not burning its charge properly — its power strokes are measurably weaker than the rest.',
  },
  P0307: {
    title: 'Cylinder 7 misfire detected',
    brief: 'Cylinder 7 is not burning its charge properly — its power strokes are measurably weaker than the rest.',
  },
  P0308: {
    title: 'Cylinder 8 misfire detected',
    brief: 'Cylinder 8 is not burning its charge properly — its power strokes are measurably weaker than the rest.',
  },
  P0309: {
    title: 'Cylinder 9 misfire detected',
    brief: 'Cylinder 9 is not burning its charge properly — its power strokes are measurably weaker than the rest.',
  },
  P0310: {
    title: 'Cylinder 10 misfire detected',
    brief: 'Cylinder 10 is not burning its charge properly — its power strokes are measurably weaker than the rest.',
  },
  P0311: {
    title: 'Cylinder 11 misfire detected',
    brief: 'Cylinder 11 is not burning its charge properly — its power strokes are measurably weaker than the rest.',
  },
  P0312: {
    title: 'Cylinder 12 misfire detected',
    brief: 'Cylinder 12 is not burning its charge properly — its power strokes are measurably weaker than the rest.',
  },
  P0313: {
    title: 'Misfire detected with low fuel level',
    brief:
      'The engine misfired while the tank was nearly empty. The computer records it separately because running out of fuel is the obvious explanation — fill up before chasing anything else.',
    risk: {
      severity: 'minor',
      drive: 'drive-with-care',
      note: 'Fill the tank and see whether it returns. Running a tank dry repeatedly is hard on the fuel pump.',
    },
  },
  P0314: {
    title: 'Single cylinder misfire, cylinder not identified',
    brief:
      'One cylinder is misfiring but the computer cannot say which — usually because the engine has no camshaft signal to tell the cylinders apart at that moment.',
  },
  P0315: {
    title: 'Crankshaft position system variation not learned',
    brief:
      'The computer has not learned the tiny machining variations in the crank trigger wheel, so it cannot trust its own misfire detection. A relearn procedure is needed, normally after a sensor or engine repair.',
    risk: {
      severity: 'minor',
      drive: 'safe-to-drive',
      note: 'Nothing is broken — the misfire monitor simply cannot run until the relearn is done with a scan tool.',
    },
  },
  P0316: {
    title: 'Misfire detected in the first 1000 revolutions',
    brief:
      'The engine misfired immediately after starting and then settled. Fuel that has drained back overnight, a weak coil that only misbehaves cold, or oil on a plug.',
  },

  // ── Engine speed input and knock, P0320–P0334 ───────────────────────────
  P0320: {
    title: 'Ignition or distributor engine speed input circuit malfunction',
    brief:
      'The engine speed signal the ignition system depends on is missing or corrupt. On older cars this comes from the distributor rather than a crank sensor.',
  },
  P0321: {
    title: 'Ignition or distributor engine speed input range/performance',
    brief:
      'The engine speed signal is present but wrong — it does not agree with the other speed references the computer holds.',
  },
  P0322: {
    title: 'Ignition or distributor engine speed input, no signal',
    brief:
      'No engine speed pulses are arriving at all while the engine is turning. A dead sensor, a broken wire, or a trigger wheel that has come adrift.',
  },
  P0323: {
    title: 'Ignition or distributor engine speed input intermittent',
    brief:
      'The engine speed signal drops out and returns. A classic cause of an engine that cuts out and then restarts as if nothing happened.',
  },
  P0324: {
    title: 'Knock control system error',
    brief:
      'The knock control system itself has failed its internal check, rather than one sensor. The computer retards ignition timing as a precaution, costing power and economy.',
  },
  P0325: {
    title: 'Knock sensor 1 circuit malfunction, bank 1',
    brief:
      'The knock sensor is a microphone bolted to the block that listens for fuel detonating early. Bank 1’s sensor is not producing a usable signal, so timing is pulled back for safety.',
  },
  P0326: {
    title: 'Knock sensor 1 circuit range/performance, bank 1',
    brief:
      'Bank 1’s knock sensor produces a signal, but at the wrong level for the engine noise around it. Often a sensor that has come loose on the block, so it cannot hear properly.',
  },
  P0327: {
    title: 'Knock sensor 1 circuit low input, bank 1',
    brief:
      'Bank 1’s knock sensor signal is below its valid range — an open circuit, a shorted wire, or a sensor that has gone dead.',
  },
  P0328: {
    title: 'Knock sensor 1 circuit high input, bank 1',
    brief:
      'Bank 1’s knock sensor signal is above its valid range. A short to voltage, or genuine mechanical noise the sensor is picking up as knock.',
  },
  P0329: {
    title: 'Knock sensor 1 circuit intermittent, bank 1',
    brief:
      'Bank 1’s knock sensor signal cuts in and out. Its wiring lives in a hot, dirty place and chafes easily.',
  },
  P0330: {
    title: 'Knock sensor 2 circuit malfunction, bank 2',
    brief:
      'The knock sensor on the second cylinder bank is not producing a usable signal, so ignition timing on that bank is retarded as a precaution.',
  },
  P0331: {
    title: 'Knock sensor 2 circuit range/performance, bank 2',
    brief:
      'Bank 2’s knock sensor signal is at the wrong level for the surrounding engine noise, often because the sensor is not torqued down properly.',
  },
  P0332: {
    title: 'Knock sensor 2 circuit low input, bank 2',
    brief: 'Bank 2’s knock sensor signal is below its valid range — an open circuit or a dead sensor.',
  },
  P0333: {
    title: 'Knock sensor 2 circuit high input, bank 2',
    brief: 'Bank 2’s knock sensor signal is above its valid range — a short to voltage, or genuine mechanical noise.',
  },
  P0334: {
    title: 'Knock sensor 2 circuit intermittent, bank 2',
    brief: 'Bank 2’s knock sensor signal cuts in and out, usually chafed wiring rather than the sensor itself.',
  },

  // ── Crankshaft position, P0335–P0339 and P0385–P0389 ────────────────────
  P0335: {
    title: 'Crankshaft position sensor A circuit malfunction',
    brief:
      'The crank sensor is the master timing reference for both spark and injection. Its signal is missing or unusable, and without it the engine cannot be run at all.',
  },
  P0336: {
    title: 'Crankshaft position sensor A range/performance',
    brief:
      'Crank pulses are arriving but the pattern is wrong — pulses missing, or the reference gap in the wrong place. A damaged trigger wheel, or debris on the sensor tip.',
  },
  P0337: {
    title: 'Crankshaft position sensor A circuit low input',
    brief:
      'The crank sensor signal is too weak to read. An air gap that has opened up, a failing sensor, or a shorted wire.',
  },
  P0338: {
    title: 'Crankshaft position sensor A circuit high input',
    brief:
      'The crank sensor signal is stronger or higher than it should be — usually a wiring fault rather than the sensor.',
  },
  P0339: {
    title: 'Crankshaft position sensor A circuit intermittent',
    brief:
      'The crank signal disappears and comes back. This is the fault behind an engine that cuts out when hot and restarts once it has cooled.',
  },
  P0385: {
    title: 'Crankshaft position sensor B circuit',
    brief:
      'The second crankshaft sensor, used on engines that check one against the other, is not giving a usable signal.',
  },
  P0386: {
    title: 'Crankshaft position sensor B range/performance',
    brief:
      'The second crank sensor produces pulses, but they do not agree with the first sensor’s pattern.',
  },
  P0387: {
    title: 'Crankshaft position sensor B circuit low input',
    brief: 'The second crank sensor signal is too weak — a widened air gap, a failing sensor, or a shorted wire.',
  },
  P0388: {
    title: 'Crankshaft position sensor B circuit high input',
    brief: 'The second crank sensor signal is above its valid range, normally a wiring fault.',
  },
  P0389: {
    title: 'Crankshaft position sensor B circuit intermittent',
    brief: 'The second crank sensor signal drops out and returns, pointing at a connector or a chafed wire.',
  },

  // ── Camshaft position, P0340–P0349, P0365–P0369, P0390–P0394 ───────────
  P0340: {
    title: 'Camshaft position sensor A circuit malfunction, bank 1',
    brief:
      'The cam sensor tells the computer which stroke each cylinder is on, so it can inject and spark on the right revolution. Bank 1’s sensor is not reporting.',
  },
  P0341: {
    title: 'Camshaft position sensor A range/performance, bank 1',
    brief:
      'The bank 1 cam signal arrives but does not line up with the crank signal as expected. A slipped timing chain, a worn phaser, or a damaged trigger ring.',
  },
  P0342: {
    title: 'Camshaft position sensor A circuit low input, bank 1',
    brief: 'The bank 1 cam sensor signal is below its valid range — a short to ground or a failing sensor.',
  },
  P0343: {
    title: 'Camshaft position sensor A circuit high input, bank 1',
    brief: 'The bank 1 cam sensor signal is above its valid range — an open circuit or a short to voltage.',
  },
  P0344: {
    title: 'Camshaft position sensor A circuit intermittent, bank 1',
    brief:
      'The bank 1 cam signal cuts in and out, which typically shows up as a long crank or an occasional no-start.',
  },
  P0345: {
    title: 'Camshaft position sensor A circuit, bank 2',
    brief: 'The camshaft position sensor on the second cylinder bank is not giving a usable signal.',
  },
  P0346: {
    title: 'Camshaft position sensor A range/performance, bank 2',
    brief:
      'The bank 2 cam signal does not line up with the crank signal — that bank’s chain, tensioner or phaser is the place to look.',
  },
  P0347: {
    title: 'Camshaft position sensor A circuit low input, bank 2',
    brief: 'The bank 2 cam sensor signal is below its valid range — a short to ground or a failing sensor.',
  },
  P0348: {
    title: 'Camshaft position sensor A circuit high input, bank 2',
    brief: 'The bank 2 cam sensor signal is above its valid range — an open circuit or a short to voltage.',
  },
  P0349: {
    title: 'Camshaft position sensor A circuit intermittent, bank 2',
    brief: 'The bank 2 cam signal drops out and returns, pointing at a connector rather than the sensor.',
  },
  P0365: {
    title: 'Camshaft position sensor B circuit, bank 1',
    brief:
      'The second camshaft sensor on bank 1 — the exhaust cam on most engines — is not giving a usable signal.',
  },
  P0366: {
    title: 'Camshaft position sensor B range/performance, bank 1',
    brief: 'The bank 1 exhaust cam signal arrives but does not agree with the crank position as expected.',
  },
  P0367: {
    title: 'Camshaft position sensor B circuit low input, bank 1',
    brief: 'The bank 1 exhaust cam sensor signal is below its valid range — a short to ground or a dead sensor.',
  },
  P0368: {
    title: 'Camshaft position sensor B circuit high input, bank 1',
    brief: 'The bank 1 exhaust cam sensor signal is above its valid range — an open circuit or a short to voltage.',
  },
  P0369: {
    title: 'Camshaft position sensor B circuit intermittent, bank 1',
    brief: 'The bank 1 exhaust cam signal cuts in and out, normally a connector or chafed wiring.',
  },
  P0390: {
    title: 'Camshaft position sensor B circuit, bank 2',
    brief: 'The second camshaft sensor on bank 2 is not giving a usable signal.',
  },
  P0391: {
    title: 'Camshaft position sensor B range/performance, bank 2',
    brief: 'The bank 2 exhaust cam signal does not line up with the crank position as expected.',
  },
  P0392: {
    title: 'Camshaft position sensor B circuit low input, bank 2',
    brief: 'The bank 2 exhaust cam sensor signal is below its valid range — a short to ground or a dead sensor.',
  },
  P0393: {
    title: 'Camshaft position sensor B circuit high input, bank 2',
    brief: 'The bank 2 exhaust cam sensor signal is above its valid range — an open circuit or a short to voltage.',
  },
  P0394: {
    title: 'Camshaft position sensor B circuit intermittent, bank 2',
    brief: 'The bank 2 exhaust cam signal drops out and returns, pointing at a connector or a chafed wire.',
  },

  // ── Ignition coils, P0350–P0362 ─────────────────────────────────────────
  P0350: {
    title: 'Ignition coil primary or secondary circuit malfunction',
    brief:
      'A coil circuit is faulty without the computer being able to name which. A shared supply feed or ground is a good place to start.',
  },
  P0351: {
    title: 'Ignition coil A primary or secondary circuit malfunction',
    brief:
      'The first ignition coil is not behaving electrically as it should. Without a healthy spark that cylinder cannot burn its fuel.',
  },
  P0352: {
    title: 'Ignition coil B primary or secondary circuit malfunction',
    brief: 'The second ignition coil is not switching as commanded — the coil, its plug, or the wire to the computer.',
  },
  P0353: {
    title: 'Ignition coil C primary or secondary circuit malfunction',
    brief: 'The third ignition coil is not switching as commanded — the coil, its plug, or the wire to the computer.',
  },
  P0354: {
    title: 'Ignition coil D primary or secondary circuit malfunction',
    brief: 'The fourth ignition coil is not switching as commanded — the coil, its plug, or the wire to the computer.',
  },
  P0355: {
    title: 'Ignition coil E primary or secondary circuit malfunction',
    brief: 'The fifth ignition coil is not switching as commanded — the coil, its plug, or the wire to the computer.',
  },
  P0356: {
    title: 'Ignition coil F primary or secondary circuit malfunction',
    brief: 'The sixth ignition coil is not switching as commanded — the coil, its plug, or the wire to the computer.',
  },
  P0357: {
    title: 'Ignition coil G primary or secondary circuit malfunction',
    brief: 'The seventh ignition coil is not switching as commanded — the coil, its plug, or the wire to the computer.',
  },
  P0358: {
    title: 'Ignition coil H primary or secondary circuit malfunction',
    brief: 'The eighth ignition coil is not switching as commanded — the coil, its plug, or the wire to the computer.',
  },
  P0359: {
    title: 'Ignition coil I primary or secondary circuit malfunction',
    brief: 'The ninth ignition coil is not switching as commanded — the coil, its plug, or the wire to the computer.',
  },
  P0360: {
    title: 'Ignition coil J primary or secondary circuit malfunction',
    brief: 'The tenth ignition coil is not switching as commanded — the coil, its plug, or the wire to the computer.',
  },
  P0361: {
    title: 'Ignition coil K primary or secondary circuit malfunction',
    brief: 'The eleventh ignition coil is not switching as commanded — the coil, its plug, or the wire to the computer.',
  },
  P0362: {
    title: 'Ignition coil L primary or secondary circuit malfunction',
    brief: 'The twelfth ignition coil is not switching as commanded — the coil, its plug, or the wire to the computer.',
  },

  // ── High resolution timing reference, P0370–P0374 ───────────────────────
  P0370: {
    title: 'Timing reference high resolution signal A malfunction',
    brief:
      'The fine-resolution timing signal, used on top of the ordinary crank signal for precise spark control, is missing or corrupt.',
  },
  P0371: {
    title: 'Timing reference high resolution signal A, too many pulses',
    brief:
      'More timing pulses are arriving than the trigger wheel can produce — electrical noise, or a damaged wheel producing extra edges.',
  },
  P0372: {
    title: 'Timing reference high resolution signal A, too few pulses',
    brief:
      'Fewer timing pulses are arriving than expected. Debris on the sensor, a widened air gap, or missing teeth on the trigger wheel.',
  },
  P0373: {
    title: 'Timing reference high resolution signal A, erratic pulses',
    brief:
      'The timing pulses are arriving unevenly. A loose sensor, a bent trigger wheel, or interference on the signal wire.',
  },
  P0374: {
    title: 'Timing reference high resolution signal A, no pulses',
    brief:
      'No fine-resolution timing pulses at all while the engine turns — a dead sensor or a broken circuit.',
  },
};
