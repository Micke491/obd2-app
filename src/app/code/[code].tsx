import { useLocalSearchParams } from 'expo-router';

import { DtcDetailScreen } from '@/features/dtc/screens/dtc-detail-screen';

/**
 * Deliberately outside the connection guard: looking a code up with the adapter
 * unplugged is a real thing people want to do, and the data is entirely local.
 */
export default function Route() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <DtcDetailScreen code={code ?? ''} />;
}
