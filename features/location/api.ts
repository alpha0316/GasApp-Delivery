import { ApiError, api } from '../../lib/api/client';

// The server answers 429 when two pings come less than 3 seconds apart.
// The foreground loop and the background task can overlap, so one 429 is expected.
export async function sendLocation(lat: number, lng: number, token?: string | null): Promise<void> {
  try {
    await api('/rider/location', { method: 'PATCH', body: { lat, lng }, token });
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) return;
    throw error;
  }
}
