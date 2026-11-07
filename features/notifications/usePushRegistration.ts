import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { errorMessage } from '../../lib/api/client';
import { registerForPush } from './push';

// Registers the Expo push token after sign-in. A tap on an order offer opens the pool.
export function usePushRegistration() {
  const router = useRouter();

  useEffect(() => {
    registerForPush().catch((error) => console.warn('Push registration failed:', errorMessage(error)));

    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      router.navigate('/home');
    });
    return () => subscription.remove();
  }, [router]);
}
