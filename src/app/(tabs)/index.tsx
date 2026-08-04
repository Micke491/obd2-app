import { Redirect } from 'expo-router';

import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import { DashboardScreen } from '@/features/dashboard/screens/dashboard-screen';

export default function DashboardRoute() {
  const { client } = useObdConnection();
  if (!client) return <Redirect href="/" />;
  return <DashboardScreen />;
}
