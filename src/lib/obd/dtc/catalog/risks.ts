import type { CatalogRisk } from '../types';

/**
 * Urgency overrides shared by more than one range file.
 *
 * A code family's default urgency is a decent guess for most of its members and
 * badly wrong for a handful. These are the handful: the codes where following
 * the family default would tell somebody a seizing engine is worth booking in
 * next week.
 */

export const FAN_RISK: CatalogRisk = {
  severity: 'serious',
  drive: 'drive-with-care',
  note: 'Airflow through the radiator only comes from the fan below about 40 km/h, so the engine can overheat in traffic while staying perfectly cool on the motorway. Watch the temperature gauge and avoid queues.',
};

export const OIL_RISK: CatalogRisk = {
  severity: 'serious',
  drive: 'limp-to-shop',
  note: 'Check the oil level on the dipstick before driving anywhere. If the level is right this is probably the sensor, but an engine run without oil pressure is scrap within minutes.',
};

export const CHARGING_RISK: CatalogRisk = {
  severity: 'serious',
  drive: 'limp-to-shop',
  note: 'If the alternator has stopped charging, the car is running on the battery alone and will stop for good once it is flat — usually within half an hour, sooner with the lights on.',
};

export const TIMING_RISK: CatalogRisk = {
  severity: 'serious',
  drive: 'limp-to-shop',
  note: 'Timing that has already slipped can slip further, and on most engines that bends valves. Keep the trip short.',
};

export const OVERHEAT_RISK: CatalogRisk = {
  severity: 'critical',
  drive: 'stop-now',
  note: 'An overheating engine warps heads and destroys head gaskets within minutes. Stop, let it cool, and check the coolant level before going anywhere.',
};
