import { Redirect } from 'expo-router';

import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import { LiveDataScreen } from '@/features/live-data/screens/live-data-screen';

export default function LiveDataRoute() {
  const { client } = useObdConnection();
  if (!client) return <Redirect href="/" />;
  return <LiveDataScreen />;
}
