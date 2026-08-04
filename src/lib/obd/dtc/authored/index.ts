import type { AuthoredDtc } from '../types';

import { CHASSIS_BODY_NETWORK } from './chassis-body-network';
import { BOOST_DIESEL } from './p0-boost-diesel';
import { EMISSIONS } from './p0-emissions';
import { FUEL_AIR } from './p0-fuel-air';
import { IGNITION } from './p0-ignition';
import { MISC } from './p0-misc';
import { SENSORS } from './p0-sensors';

/**
 * Hand-written detail for the codes people actually see.
 *
 * Everything not listed here still gets a real explanation — the resolver falls
 * through to the derive rules and then to the code family. These are simply the
 * ones worth writing out properly.
 */
export const AUTHORED: Record<string, AuthoredDtc> = {
  ...FUEL_AIR,
  ...IGNITION,
  ...EMISSIONS,
  ...MISC,
  ...SENSORS,
  ...BOOST_DIESEL,
  ...CHASSIS_BODY_NETWORK,
};

export const AUTHORED_CODES = Object.keys(AUTHORED).sort();
