/** The areas a driver thinks in. Deliberately short. */
export type Part =
  | 'engine'
  | 'transmission'
  | 'brakes'
  | 'restraints'
  | 'steering'
  | 'suspension'
  | 'body'
  | 'instruments'
  | 'network'
  | 'other';

export const PART_LABELS: Record<Part, string> = {
  engine: 'Engine',
  transmission: 'Transmission',
  brakes: 'Brakes and stability',
  restraints: 'Airbags and restraints',
  steering: 'Steering',
  suspension: 'Suspension',
  body: 'Body and comfort',
  instruments: 'Instruments',
  network: 'Network',
  other: 'Other modules',
};

/** Roughly most-consequential first, which is also the order results show in. */
export const PART_ORDER: Part[] = [
  'engine',
  'brakes',
  'restraints',
  'steering',
  'transmission',
  'suspension',
  'body',
  'instruments',
  'network',
  'other',
];
