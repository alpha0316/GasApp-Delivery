import { useQuery } from '@tanstack/react-query';
import { useMemo, useRef } from 'react';
import type { LatLng } from '../../types/order';
import { distanceMeters } from '../../utils/geo';
import { fetchRoute } from '../orders/api';

// Rounds to about 110 m so a new GPS ping does not refetch the route each time.
const round = (value: number) => Math.round(value * 1000) / 1000;

// Road-snapped path from the backend routing proxy. When the route is not
// available (for example 503 NOT_CONFIGURED), `coordinates` stays empty and
// the map shows markers only.
export function useRoutePath(from: LatLng | null, to: LatLng | null) {
  const query = useQuery({
    queryKey: ['route', from && round(from.latitude), from && round(from.longitude), to && round(to.latitude), to && round(to.longitude)],
    queryFn: () =>
      fetchRoute(
        { lat: from!.latitude, lng: from!.longitude },
        { lat: to!.latitude, lng: to!.longitude }
      ),
    enabled: from !== null && to !== null,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const coordinates = useMemo<LatLng[]>(
    () =>
      (query.data?.route.geometry.coordinates ?? []).map(([longitude, latitude]) => ({ latitude, longitude })),
    [query.data]
  );

  return { coordinates, error: query.error };
}

// 0-1 progress toward a target, from the distance when the leg started.
export function useLegProgress(position: LatLng | null, target: LatLng | null, legKey: string): number {
  const start = useRef<{ key: string; distance: number } | null>(null);
  if (!position || !target) return 0;

  const distance = distanceMeters(position, target);
  if (!start.current || start.current.key !== legKey) {
    start.current = { key: legKey, distance };
  }
  if (start.current.distance <= 0) return 1;
  return Math.min(1, Math.max(0, 1 - distance / start.current.distance));
}
