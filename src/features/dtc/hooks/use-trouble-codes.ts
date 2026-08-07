import { useContext } from 'react';

import {
  TroubleCodesContext,
  type TroubleCodesValue,
} from '../context/trouble-codes-provider';

export type {
  DtcGroup,
  ReadState,
  ReportedFaults,
  TroubleCodesValue,
} from '../context/trouble-codes-provider';

/**
 * Shared rather than per-screen: the hub card and the Trouble codes screen have
 * to agree on whether the car has actually been asked, or the hub ends up
 * showing an all-clear for a read that was never taken.
 */
export function useTroubleCodes(): TroubleCodesValue {
  const value = useContext(TroubleCodesContext);

  if (!value) {
    throw new Error('useTroubleCodes must be used inside a TroubleCodesProvider');
  }

  return value;
}
