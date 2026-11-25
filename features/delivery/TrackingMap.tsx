import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, MarkerAnimated, Polyline } from 'react-native-maps';
import VehicleMarker from '../../components/VehicleMarker';
import MapLocationMarker from '../../components/MapLocationMarker';
import { MapPinDuotoneIcon } from '../../components/icons/OrderCardIcons';
import type { VehicleType } from '../../lib/api/types';
import type { LatLng } from '../../types/order';
import { useAnimatedRiderCoordinate } from './useAnimatedRiderCoordinate';

// Pin colours by what the rider still has to do at that customer.
export const CUSTOMER_PIN_COLORS = {
  pickup: '#FF8D28',
  dropoff: '#52B922',
  done: '#A1A1AA',
} as const;

export interface StationPin {
  id: string;
  name: string;
  location: LatLng;
  // current = where the rider is heading now; done = already filled there.
  state: 'current' | 'pending' | 'done';
}

const STATION_PIN_COLORS: Record<StationPin['state'], string> = {
  current: '#007AFF',
  pending: '#7BB6FF',
  done: '#A1A1AA',
};

export interface CustomerPin {
  id: string;
  name: string;
  location: LatLng;
  color: string;
}

interface Props {
  position: LatLng | null;
  heading: number;
  // Picks the top-down vehicle art drawn for the rider.
  vehicleType: VehicleType | undefined;
  // Every filling station this run uses (customers may pick different ones).
  stations: StationPin[];
  // Every customer in this delivery session.
  customers: CustomerPin[];
  // Where the rider is heading right now; the camera reframes on each new leg.
  target: LatLng | null;
  // Overall trip reference: station <-> customer (road-snapped).
  referenceRoute: LatLng[];
  // Active leg: rider -> current target (road-snapped).
  activeRoute: LatLng[];
  routeColor: string;
  // Tapping a customer pin previews the road route to them.
  onCustomerPress?: (id: string) => void;
  // Tapping empty map clears the preview.
  onMapPress?: () => void;
  selectedCustomerId?: string | null;
  previewRoute?: LatLng[];
}

const PREVIEW_COLOR = '#7C3AED';

// Room for the header above and the order card below the map.
const EDGE_PADDING = { top: 140, right: 60, bottom: 360, left: 60 };

export default function TrackingMap({
  position,
  heading,
  vehicleType,
  stations,
  customers,
  target,
  referenceRoute,
  activeRoute,
  routeColor,
  onCustomerPress,
  onMapPress,
  selectedCustomerId = null,
  previewRoute = [],
}: Props) {
  const mapRef = useRef<MapView>(null);
  const riderCoordinate = useAnimatedRiderCoordinate(position);

  const initialRegion = useMemo(() => {
    const points = [...customers.map((c) => c.location), ...stations.map((s) => s.location), position].filter(
      (p): p is LatLng => p !== null
    );
    if (points.length === 0) return undefined;
    const lats = points.map((p) => p.latitude);
    const lngs = points.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: (maxLat - minLat) * 3 + 0.02,
      longitudeDelta: (maxLng - minLng) * 3 + 0.02,
    };
    // MapView reads this only for its first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Frame the rider and their next stop whenever a new leg starts.
  const positionRef = useRef(position);
  positionRef.current = position;
  const targetLat = target?.latitude;
  const targetLng = target?.longitude;
  useEffect(() => {
    if (targetLat === undefined || targetLng === undefined) return;
    const points = [{ latitude: targetLat, longitude: targetLng }];
    if (positionRef.current) points.push(positionRef.current);
    const timeout = setTimeout(
      () => mapRef.current?.fitToCoordinates(points, { edgePadding: EDGE_PADDING, animated: true }),
      300
    );
    return () => clearTimeout(timeout);
  }, [targetLat, targetLng]);

  // Frame the previewed route once it arrives; back to the current leg when it's cleared.
  const hasPreview = previewRoute.length > 1;
  const previewRef = useRef(previewRoute);
  previewRef.current = previewRoute;
  const targetRef = useRef(target);
  targetRef.current = target;
  useEffect(() => {
    if (hasPreview && selectedCustomerId) {
      mapRef.current?.fitToCoordinates(previewRef.current, { edgePadding: EDGE_PADDING, animated: true });
      return;
    }
    if (!selectedCustomerId && targetRef.current) {
      const points = [targetRef.current, ...(positionRef.current ? [positionRef.current] : [])];
      mapRef.current?.fitToCoordinates(points, { edgePadding: EDGE_PADDING, animated: true });
    }
  }, [hasPreview, selectedCustomerId]);

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={initialRegion}
      onPress={(e) => {
        // iOS also reports marker taps here; only a tap on empty map clears.
        if (e.nativeEvent.action === 'marker-press') return;
        onMapPress?.();
      }}
    >
      {/* Filling stations */}
      {stations.map((s) => (
        <Marker
          key={`${s.id}:${s.state}`}
          coordinate={s.location}
          anchor={{ x: 0.5, y: 0.75 }}
          zIndex={s.state === 'current' ? 8 : 2}
        >
          <MapLocationMarker label={s.name} accentColor={STATION_PIN_COLORS[s.state]} />
        </Marker>
      ))}
      {/* Customers */}
      {customers.map((c) => (
        <Marker
          key={`${c.id}:${c.color}:${c.id === selectedCustomerId}`}
          coordinate={c.location}
          anchor={{ x: 0.5, y: 0.75 }}
          onPress={() => onCustomerPress?.(c.id)}
          zIndex={c.id === selectedCustomerId ? 10 : 1}
        >
          <MapLocationMarker
            label={c.name}
            icon={<MapPinDuotoneIcon />}
            accentColor={c.id === selectedCustomerId ? PREVIEW_COLOR : c.color}
          />
        </Marker>
      ))}
      {/* Rider */}
      {position && (
        <MarkerAnimated coordinate={riderCoordinate} title="You" anchor={{ x: 0.5, y: 0.5 }}>
          <VehicleMarker vehicleType={vehicleType} rotation={heading} />
        </MarkerAnimated>
      )}

      {referenceRoute.length > 1 && (
        <Polyline
          coordinates={referenceRoute}
          strokeColor="rgba(0,0,0,0.15)"
          strokeWidth={2}
          lineDashPattern={[4, 4]}
        />
      )}
      {activeRoute.length > 1 && (
        <Polyline coordinates={activeRoute} strokeColor={routeColor} strokeWidth={4} lineDashPattern={[8, 6]} />
      )}
      {hasPreview && <Polyline coordinates={previewRoute} strokeColor={PREVIEW_COLOR} strokeWidth={5} zIndex={5} />}
    </MapView>
  );
}
