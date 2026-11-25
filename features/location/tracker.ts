import * as Location from 'expo-location';
import { errorMessage } from '../../lib/api/client';
import { MOCK_API, mockRiderStart } from '../../lib/api/devMock';
import { bearingBetween } from '../../utils/geo';
import { sendLocation } from './api';
import { LOCATION_TASK } from './backgroundTask';
import { useLocationStore } from './store';

// The server wants a ping every 5-10 seconds while the rider is online.
export const PING_INTERVAL_MS = 7000;

let timer: ReturnType<typeof setInterval> | null = null;

async function pingOnce(onFirstSuccess?: () => void) {
  try {
    const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const { latitude, longitude } = fix.coords;
    const store = useLocationStore.getState();
    const previous = store.position;
    const next = { latitude, longitude };
    const heading =
      fix.coords.heading != null && fix.coords.heading >= 0
        ? fix.coords.heading
        : previous
          ? bearingBetween(previous, next)
          : store.heading;
    store.setPosition(next, heading);
    await sendLocation(latitude, longitude);
    onFirstSuccess?.();
  } catch (error) {
    useLocationStore.getState().setError(errorMessage(error));
  }
}

export type StartResult = { ok: true; background: boolean } | { ok: false; reason: string };

// Starts the foreground loop and, when permitted, the background updates.
export async function startTracking(onPing?: () => void): Promise<StartResult> {
  // Mock mode has no real GPS: park the rider at the scenario's start point
  // and let features/location/simulator.ts move them during a delivery.
  if (MOCK_API) {
    const store = useLocationStore.getState();
    if (!store.position) store.setPosition(mockRiderStart(), 0);
    onPing?.();
    return { ok: true, background: true };
  }

  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) {
    return { ok: false, reason: 'Allow location access to receive orders.' };
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.granted) {
    const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
    if (!started) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: PING_INTERVAL_MS,
        distanceInterval: 0,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'You are online',
          notificationBody: 'Sharing your location to receive orders.',
        },
      });
    }
  }

  if (!timer) {
    let reported = false;
    const tick = () =>
      pingOnce(() => {
        if (!reported) {
          reported = true;
          onPing?.();
        }
      });
    void tick();
    timer = setInterval(tick, PING_INTERVAL_MS);
  }

  return { ok: true, background: background.granted };
}

export async function stopTracking(): Promise<void> {
  if (MOCK_API) {
    useLocationStore.getState().clear();
    return;
  }
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
  useLocationStore.getState().clear();
}
