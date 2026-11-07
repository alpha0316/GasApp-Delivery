import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, MarkerAnimated, Polyline } from 'react-native-maps';
import BikeRiderMarker from '../../components/BikeRiderMarker';
import MapLocationMarker from '../../components/MapLocationMarker';
import { MapPinDuotoneIcon } from '../../components/icons/OrderCardIcons';
import type { LatLng, QueueOrder } from '../../types/order';
import { useAnimatedRiderCoordinate } from './useAnimatedRiderCoordinate';

interface Props {
  position: LatLng | null;
  heading: number;
  stationLocation: LatLng | null;
  stationName: string;
  customerLocation: LatLng | null;
  customerName: string;
  // Set for a batch: one customer marker per queued order.
  batchQueue: QueueOrder[] | null;
  // Overall trip reference: station <-> customer (road-snapped).
  referenceRoute: LatLng[];
  // Active leg: rider -> current target (road-snapped).
  activeRoute: LatLng[];
  routeColor: string;
}

export default function TrackingMap({
  position,
  heading,
  stationLocation,
  stationName,
  customerLocation,
  customerName,
  batchQueue,
  referenceRoute,
  activeRoute,
  routeColor,
}: Props) {
  const riderCoordinate = useAnimatedRiderCoordinate(position);

  const initialRegion = useMemo(() => {
    const points = [customerLocation, stationLocation, position].filter((p): p is LatLng => p !== null);
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
  }, [customerLocation, stationLocation, position]);

  return (
    <MapView style={StyleSheet.absoluteFill} initialRegion={initialRegion}>
      {/* Filling station */}
      {stationLocation && (
        <Marker coordinate={stationLocation} anchor={{ x: 0.5, y: 0.75 }}>
          <MapLocationMarker label={stationName} accentColor="#007AFF" />
        </Marker>
      )}
      {/* Customer(s) */}
      {batchQueue
        ? batchQueue.map((o) => (
            <Marker key={o.id} coordinate={o.customerLocation} anchor={{ x: 0.5, y: 0.75 }}>
              <MapLocationMarker
                label={o.customerName}
                icon={<MapPinDuotoneIcon />}
                accentColor={o.status === 'delivered' ? '#A1A1AA' : '#52B922'}
              />
            </Marker>
          ))
        : customerLocation && (
            <Marker coordinate={customerLocation} anchor={{ x: 0.5, y: 0.75 }}>
              <MapLocationMarker label={customerName} icon={<MapPinDuotoneIcon />} accentColor="#52B922" />
            </Marker>
          )}
      {/* Rider */}
      {position && (
        <MarkerAnimated coordinate={riderCoordinate} title="You" anchor={{ x: 0.5, y: 0.5 }}>
          <BikeRiderMarker rotation={heading} />
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
    </MapView>
  );
}
