import { Redirect } from 'expo-router';

import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import { CodesScreen } from '@/features/dtc/screens/codes-screen';

export default function CodesRoute() {
  const { client } = useObdConnection();
  if (!client) return <Redirect href="/" />;
  return <CodesScreen />;
}
