import { LatLng } from '../types/order';

// Free OSM-based routing (no API key). Fine for dev/demo volumes; swap for a
// paid provider (Mapbox/Google Directions) if this needs production traffic.
const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';

export async function fetchRoadRoute(origin: LatLng, destination: LatLng): Promise<LatLng[]> {
  const url = `${OSRM_BASE_URL}/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`OSRM request failed: ${response.status}`);
    const data = await response.json();
    const coordinates = data?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length === 0) {
      throw new Error('No route geometry returned');
    }
    return coordinates.map(([longitude, latitude]: [number, number]) => ({ latitude, longitude }));
  } catch (err) {
    // Fall back to a straight line so the map still shows something.
    return [origin, destination];
  }
}

// Compass bearing (degrees, 0 = north) from one point to the next, used to
// turn the bike icon to face its direction of travel.
export function bearingBetween(from: LatLng, to: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const dLng = toRad(to.longitude - from.longitude);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}
