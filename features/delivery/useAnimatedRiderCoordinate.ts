import { useEffect, useRef } from 'react';
import { AnimatedRegion } from 'react-native-maps';
import type { LatLng } from '../../types/order';

const MARKER_GLIDE_MS = 1000;

// Glides the rider marker to each new GPS fix. Pass the result to `MarkerAnimated`.
export function useAnimatedRiderCoordinate(position: LatLng | null): LatLng {
  const region = useRef(
    new AnimatedRegion({
      latitude: position?.latitude ?? 0,
      longitude: position?.longitude ?? 0,
      latitudeDelta: 0,
      longitudeDelta: 0,
    }),
  ).current;

  useEffect(() => {
    if (!position) return;
    // react-native-maps' .timing() type declares a `toValue`-based config
    // (copied from Animated.timing) but the implementation expects flat
    // latitude/longitude fields, so this cast matches runtime behavior.
    region
      .timing({
        latitude: position.latitude,
        longitude: position.longitude,
        latitudeDelta: 0,
        longitudeDelta: 0,
        duration: MARKER_GLIDE_MS,
        useNativeDriver: false,
      } as unknown as Parameters<typeof region.timing>[0])
      .start();
  }, [position, region]);

  // MarkerAnimated takes an AnimatedRegion at runtime, but its typings declare a plain LatLng.
  return region as unknown as LatLng;
}
