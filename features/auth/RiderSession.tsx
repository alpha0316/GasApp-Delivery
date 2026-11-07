import { useLocationTracking } from '../location/hooks';
import { usePushRegistration } from '../notifications/usePushRegistration';
import { useRealtimeSync } from '../orders/useRealtimeSync';

// Background work that runs while an approved rider is signed in.
export default function RiderSession() {
  useRealtimeSync();
  useLocationTracking();
  usePushRegistration();
  return null;
}
