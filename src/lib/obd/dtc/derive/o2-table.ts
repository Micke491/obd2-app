export type O2Fault =
  | 'circuit'
  | 'low-voltage'
  | 'high-voltage'
  | 'slow-response'
  | 'no-activity'
  | 'heater';

export type O2Position = {
  bank: 1 | 2;
  sensor: 1 | 2;
  fault: O2Fault;
};

export const O2_FAULT_TEXT: Record<O2Fault, string> = {
  circuit: 'the sensor circuit is faulty',
  'low-voltage': 'the signal is stuck low',
  'high-voltage': 'the signal is stuck high',
  'slow-response': 'the sensor is switching too slowly',
  'no-activity': 'the sensor has stopped responding',
  heater: 'the sensor heater circuit is faulty',
};

const FAULT_ORDER: O2Fault[] = [
  'circuit',
  'low-voltage',
  'high-voltage',
  'slow-response',
  'no-activity',
  'heater',
];

/**
 * Oxygen sensor codes are a lookup, and the numbering is decimal.
 *
 * This is the trap in the whole file: DTC digits are hexadecimal on the wire,
 * but SAE laid these blocks out on digits that *read* as decimal. Bank 1
 * sensor 2 is P0136 through P0141 — six consecutive codes — yet 0x0139 + 1 is
 * 0x013A, not 0x0140. Stepping in hex silently produces four wrong codes per
 * block, so the table is built by counting the way the standard counts and the
 * hex-only slots (P013A–P013F and friends) are deliberately left out.
 */
function block(start: number, bank: 1 | 2, sensor: 1 | 2): Record<string, O2Position> {
  const out: Record<string, O2Position> = {};
  FAULT_ORDER.forEach((fault, index) => {
    const code = `P${String(start + index).padStart(4, '0')}`;
    out[code] = { bank, sensor, fault };
  });
  return out;
}

export const O2_POSITIONS: Record<string, O2Position> = {
  ...block(130, 1, 1),
  ...block(136, 1, 2),
  ...block(150, 2, 1),
  ...block(156, 2, 2),
};

export function describeO2Position(position: O2Position): string {
  return `Bank ${position.bank} · Sensor ${position.sensor}`;
}

/** Upstream sensors govern fuelling; downstream ones only grade the catalyst. */
export function isUpstream(position: O2Position): boolean {
  return position.sensor === 1;
}
