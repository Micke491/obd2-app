/** Which CAN addressing scheme a protocol uses, or null when it is not CAN. */
export type CanAddressing = 'can11' | 'can29';

export type SweepTarget = {
  /** What `ATSH` is set to. Also how a module is identified from here on. */
  requestId: string;
  /** `ATCRA` value, or null when the band filter covers it. */
  receiveFilter: string | null;
};

export type LinkSetting = { set: string; restore: string };

const CAN_11 = new Set(['6', '8']);
const CAN_29 = new Set(['7', '9']);

export function addressingFor(protocolId: string | null): CanAddressing | null {
  if (!protocolId) return null;
  if (CAN_11.has(protocolId)) return 'can11';
  if (CAN_29.has(protocolId)) return 'can29';
  return null;
}

/** The legislated OBD addresses, tried first so a result appears immediately. */
const LEGISLATED_11 = [0x7e0, 0x7e1, 0x7e2, 0x7e3, 0x7e4, 0x7e5, 0x7e6, 0x7e7];

/** The functional broadcast. Several modules answer it at once, so it is skipped. */
const BROADCAST_11 = 0x7df;
const BROADCAST_29 = 0x33;

const hex3 = (value: number) => value.toString(16).toUpperCase().padStart(3, '0');
const hex2 = (value: number) => value.toString(16).toUpperCase().padStart(2, '0');

function targets11(): SweepTarget[] {
  const rest: number[] = [];
  for (let id = 0x700; id <= 0x7ff; id += 1) {
    if (id === BROADCAST_11 || LEGISLATED_11.includes(id)) continue;
    rest.push(id);
  }
  return [...LEGISLATED_11, ...rest].map((id) => ({ requestId: hex3(id), receiveFilter: null }));
}

function targets29(): SweepTarget[] {
  const targets: SweepTarget[] = [];
  for (let ecu = 0x00; ecu <= 0xff; ecu += 1) {
    if (ecu === BROADCAST_29) continue;
    targets.push({
      requestId: `18DA${hex2(ecu)}F1`,
      // ISO 15765-4 normal fixed addressing: the reply is derivable, so it is
      // named exactly rather than admitted by a band.
      receiveFilter: `18DAF1${hex2(ecu)}`,
    });
  }
  return targets;
}

export function sweepTargets(addressing: CanAddressing): SweepTarget[] {
  return addressing === 'can11' ? targets11() : targets29();
}

/** Filter and mask that admit the whole diagnostic band and nothing else. */
const BAND = 0x700;

export function admitsResponse(id: number): boolean {
  return (id & BAND) === BAND;
}

/**
 * What the sweep changes about the link, and what puts each back.
 *
 * `ATST19` is 0x19 x 4.096 ms, about 102 ms. Most addresses are silent, so the
 * reply window is the whole cost of the sweep; `ATSTFF` restores the ~1.05 s
 * window `ADAPTER_INIT_SEQUENCE` sets, which slow ECUs need.
 *
 * `ATAT0` matters for the reason it matters in `connectEcu`: adaptive timing
 * learns a deadline from the replies it has seen, and hundreds of silent probes
 * would teach it a window too short for the one module about to answer.
 *
 * Headers are deliberately absent. `ATH1` would prefix every reply with its CAN
 * ID, and `acceptsReply` discards a frame that does not open with the expected
 * response mode — so every probe would time out.
 */
export function sweepLinkSettings(addressing: CanAddressing): LinkSetting[] {
  const common: LinkSetting[] = [
    { set: 'ATST19', restore: 'ATSTFF' },
    { set: 'ATAT0', restore: 'ATAT1' },
  ];

  if (addressing === 'can29') return common;

  return [
    { set: `ATCF${hex3(BAND)}`, restore: 'ATAR' },
    { set: `ATCM${hex3(BAND)}`, restore: 'ATAR' },
    ...common,
  ];
}
