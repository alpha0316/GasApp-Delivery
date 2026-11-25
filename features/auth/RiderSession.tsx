import { useLocationTracking } from '../location/hooks';
import { usePushRegistration } from '../notifications/usePushRegistration';
import { useRealtimeSync } from '../orders/useRealtimeSync';
import { useNotificationPrefs } from '../settings/notificationSettings';
import { useEffect } from 'react';

// Background work that runs while an approved rider is signed in.
export default function RiderSession() {
  useRealtimeSync();
  useLocationTracking();
  usePushRegistration();
  // The rider's notification choices, read by the push handler and the job pop-ups.
  const loadPrefs = useNotificationPrefs((s) => s.load);
  useEffect(() => {
    void loadPrefs();
  }, [loadPrefs]);
  return null;
}
