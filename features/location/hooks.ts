import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { errorMessage } from '../../lib/api/client';
import { poolKey } from '../pool/hooks';
import { useProfile, useSetRiderStatus } from '../profile/hooks';
import { startTracking, stopTracking } from './tracker';

// Runs the location pings while the rider is online. The server hides the
// pool from a rider whose location is stale.
export function useLocationTracking() {
  const profile = useProfile();
  const queryClient = useQueryClient();
  const setStatus = useSetRiderStatus();
  const online = (profile.data?.rider.riderStatus ?? 'offline') !== 'offline';

  const { mutate: goOffline } = setStatus;
  const loaded = profile.data !== undefined;

  useEffect(() => {
    if (!loaded) return;

    if (!online) {
      stopTracking().catch((error) => console.warn('Could not stop location updates:', errorMessage(error)));
      return;
    }

    let cancelled = false;
    startTracking(() => {
      void queryClient.invalidateQueries({ queryKey: poolKey });
    })
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          Alert.alert('Location needed', result.reason);
          goOffline('offline');
        } else if (!result.background) {
          Alert.alert(
            'Background location is off',
            'Orders stop reaching you when the app is closed. Allow location access "Always" in settings.'
          );
        }
      })
      .catch((error) => {
        if (cancelled) return;
        Alert.alert('Location error', errorMessage(error));
        goOffline('offline');
      });

    return () => {
      cancelled = true;
    };
  }, [online, loaded, queryClient, goOffline]);

  useEffect(
    () => () => {
      stopTracking().catch((error) => console.warn('Could not stop location updates:', errorMessage(error)));
    },
    []
  );
}
