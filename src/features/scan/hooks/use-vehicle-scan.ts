import { useContext } from 'react';

import { VehicleScanContext, type VehicleScanValue } from '../context/vehicle-scan-provider';

export type { VehicleScanValue } from '../context/vehicle-scan-provider';

/**
 * Shared rather than per-screen, for the same reason as `useTroubleCodes`: the
 * scope screen and anywhere else that shows what the car is made of have to
 * agree on what has actually been found so far.
 */
export function useVehicleScan(): VehicleScanValue {
  const value = useContext(VehicleScanContext);

  if (!value) {
    throw new Error('useVehicleScan must be used inside a VehicleScanProvider');
  }

  return value;
}
