import type { LatLng } from '../../types/order';

// A fake "road" between two points for the mock backend and the drive
// simulator: a few right-angle turns instead of a straight line, so the
// rider looks like they follow streets. Deterministic, so the drawn route and
// the simulated drive always match.
export function mockRoadPath(from: LatLng, to: LatLng): LatLng[] {
  const dLat = to.latitude - from.latitude;
  const dLng = to.longitude - from.longitude;
  const p1 = { latitude: from.latitude + dLat * 0.45, longitude: from.longitude };
  const p2 = { latitude: p1.latitude, longitude: from.longitude + dLng * 0.6 };
  const p3 = { latitude: to.latitude, longitude: p2.longitude };
  return [from, p1, p2, p3, to];
}
