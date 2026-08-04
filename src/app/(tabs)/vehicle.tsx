import { Redirect } from 'expo-router';

import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import { VehicleInfoScreen } from '@/features/vehicle-info/screens/vehicle-info-screen';

export default function VehicleRoute() {
  const { client } = useObdConnection();
  if (!client) return <Redirect href="/" />;
  return <VehicleInfoScreen />;
}
