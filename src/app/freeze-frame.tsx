import { Redirect } from 'expo-router';

import { useObdConnection } from '@/features/connection/hooks/use-obd-connection';
import { FreezeFrameScreen } from '@/features/freeze-frame/screens/freeze-frame-screen';

export default function FreezeFrameRoute() {
  const { client } = useObdConnection();
  if (!client) return <Redirect href="/" />;
  return <FreezeFrameScreen />;
}
