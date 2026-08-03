import { useContext } from 'react';

import { ObdConnectionContext, type ObdConnectionValue } from '../context/obd-connection-provider';

export function useObdConnection(): ObdConnectionValue {
  const value = useContext(ObdConnectionContext);

  if (!value) {
    throw new Error('useObdConnection must be used inside an ObdConnectionProvider');
  }

  return value;
}
