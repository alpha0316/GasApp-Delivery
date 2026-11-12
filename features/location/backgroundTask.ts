import * as TaskManager from 'expo-task-manager';
import type { LocationObject } from 'expo-location';
import { errorMessage } from '../../lib/api/client';
import { readToken } from '../../lib/storage/token';
import { sendLocation } from './api';

export const LOCATION_TASK = 'rider-location-updates';

// Must run at app start (imported by the root layout) so the OS can wake the
// task with the app in the background. The task reads the token from secure
// storage because the auth store may not exist in that context.
TaskManager.defineTask<{ locations: LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn('Location task error:', error.message);
    return;
  }
  const latest = data?.locations?.[data.locations.length - 1];
  if (!latest) return;
  try {
    const token = await readToken();
    if (!token) return;
    await sendLocation(latest.coords.latitude, latest.coords.longitude, token);
  } catch (taskError) {
    console.warn('Could not send the location from the background:', errorMessage(taskError));
  }
});
