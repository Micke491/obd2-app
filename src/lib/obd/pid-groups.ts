export type PidGroup =
  | 'engine'
  | 'fuel'
  | 'air'
  | 'emissions'
  | 'temperature'
  | 'electrical'
  | 'load'
  | 'hybrid'
  | 'trip'
  | 'other';

export const PID_GROUP_LABELS: Record<PidGroup, string> = {
  engine: 'Engine',
  fuel: 'Fuel system',
  air: 'Air intake',
  emissions: 'Emissions',
  temperature: 'Temperatures',
  electrical: 'Electrical',
  load: 'Load and throttle',
  hybrid: 'Hybrid',
  trip: 'Trip and service',
  other: 'Other',
};

/** Order sections appear in on the All sensors screen. */
export const PID_GROUP_ORDER: PidGroup[] = [
  'engine',
  'load',
  'fuel',
  'air',
  'temperature',
  'emissions',
  'electrical',
  'hybrid',
  'trip',
  'other',
];

export const PID_GROUPS: Record<string, PidGroup> = {
  // Engine
  '0C': 'engine',
  '0D': 'engine',
  '0E': 'engine',
  '1F': 'engine',
  '5D': 'engine',
  '61': 'engine',
  '62': 'engine',
  '63': 'engine',

  // Load and throttle
  '04': 'load',
  '11': 'load',
  '43': 'load',
  '45': 'load',
  '47': 'load',
  '48': 'load',
  '49': 'load',
  '4A': 'load',
  '4B': 'load',
  '4C': 'load',
  '5A': 'load',

  // Fuel system
  '03': 'fuel',
  '06': 'fuel',
  '07': 'fuel',
  '08': 'fuel',
  '09': 'fuel',
  '0A': 'fuel',
  '22': 'fuel',
  '23': 'fuel',
  '2F': 'fuel',
  '44': 'fuel',
  '51': 'fuel',
  '52': 'fuel',
  '59': 'fuel',
  '5E': 'fuel',

  // Air intake
  '0B': 'air',
  '10': 'air',
  '33': 'air',

  // Temperatures
  '05': 'temperature',
  '0F': 'temperature',
  '3C': 'temperature',
  '3D': 'temperature',
  '3E': 'temperature',
  '3F': 'temperature',
  '46': 'temperature',
  '5C': 'temperature',

  // Emissions
  '14': 'emissions',
  '15': 'emissions',
  '16': 'emissions',
  '17': 'emissions',
  '18': 'emissions',
  '19': 'emissions',
  '1A': 'emissions',
  '1B': 'emissions',
  '24': 'emissions',
  '25': 'emissions',
  '26': 'emissions',
  '27': 'emissions',
  '2C': 'emissions',
  '2D': 'emissions',
  '2E': 'emissions',
  '32': 'emissions',

  // Electrical
  '42': 'electrical',

  // Hybrid
  '5B': 'hybrid',

  // Trip and service
  '1C': 'trip',
  '21': 'trip',
  '30': 'trip',
  '31': 'trip',
  '4D': 'trip',
  '4E': 'trip',
};
