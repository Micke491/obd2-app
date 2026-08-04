import { useRouter } from 'expo-router';

import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';

export default function NotFound() {
  const router = useRouter();
  return (
    <Screen>
      <EmptyState
        icon="map-marker-question-outline"
        title="That screen does not exist"
        body="The link you followed points somewhere this app does not have."
        action={{ label: 'Back to the hub', onPress: () => router.replace('/') }}
      />
    </Screen>
  );
}
