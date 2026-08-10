import type { CatalogEntry } from '../types';

import { CHASSIS } from './chassis';
import { NETWORK } from './network';
import { AIR_FUEL } from './p0-air-fuel';
import { EMISSIONS } from './p0-emissions';
import { IGNITION } from './p0-ignition';
import { INJECTOR_BOOST } from './p0-injector-boost';
import { MODULE } from './p0-module';
import { TRANSMISSION } from './p0-transmission';
import { VEHICLE } from './p0-vehicle';
import { P2_CODES } from './p2';

/** Kept separate so a duplicated code can be caught rather than silently won. */
const SOURCES: Record<string, CatalogEntry>[] = [
  AIR_FUEL,
  INJECTOR_BOOST,
  IGNITION,
  EMISSIONS,
  VEHICLE,
  MODULE,
  TRANSMISSION,
  P2_CODES,
  NETWORK,
  CHASSIS,
];

/**
 * Every code the standard defines and this app can explain.
 *
 * Each entry carries the SAE title — the wording a garage invoice will use —
 * and a short plain-English line saying what that one code actually reports.
 * The title alone is why people end up searching a code online; the brief is
 * the answer they were going to find.
 *
 * Manufacturer-defined codes (second digit 1 or 3) differ per brand and are
 * deliberately absent. An unlisted code still gets a real explanation from the
 * code's structure and family, which is honest, rather than a wrong name.
 */
export const DTC_CATALOG: Record<string, CatalogEntry> = Object.assign({}, ...SOURCES);

export const CATALOG_CODES = Object.keys(DTC_CATALOG).sort();

/** Sum of the parts, so a code defined twice shows up as a mismatch. */
export const CATALOG_SOURCE_ENTRY_COUNT = SOURCES.reduce(
  (total, source) => total + Object.keys(source).length,
  0,
);
