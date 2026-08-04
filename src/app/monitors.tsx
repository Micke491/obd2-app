import { Redirect } from 'expo-router';

import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import { MonitorsScreen } from '@/features/monitors/screens/monitors-screen';

export default function MonitorsRoute() {
  const { client } = useObdConnection();
  if (!client) return <Redirect href="/" />;
  return <MonitorsScreen />;
}
