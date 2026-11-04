// Mirrors the lat/lng convention used by RiderDispatchPayload (flat
// lat/lng), not the LatLng{latitude,longitude} shape used internally by
// BikeRiderMarker/routing.ts — translate at the API boundary.

// ---------------------------------------------------------------------
// 1. Rider's device -> backend. One GPS fix.
// ---------------------------------------------------------------------
export interface RiderLocationPing {
  lat: number;
  lng: number;
  headingDegrees: number; // compass heading, feeds BikeRiderMarker's `rotation` prop directly
  speedKph?: number;
  accuracyMeters?: number;
  recordedAt: string; // ISO timestamp taken on-device when the fix was captured
}

// The device buffers fixes locally and flushes them as an array rather
// than firing one request per fix — covers tunnels/dead zones without
// losing track history, and lets the backend smooth/dedupe before
// relaying the latest one onward. `pings` is almost always length 1 in
// good connectivity, longer after a reconnect.
export interface RiderLocationUpdate {
  orderId: string;
  orderRef: string;
  riderId: string;
  pings: RiderLocationPing[]; // oldest -> newest
  batteryPercent?: number; // low battery is a useful explanation for tracking gaps
  sentAt: string;
}

// ---------------------------------------------------------------------
// 2. Backend -> customer app. What the tracking screen actually renders.
// ---------------------------------------------------------------------
export type DeliveryLeg = 'to_pickup' | 'to_station' | 'to_dropoff';

export interface CustomerTrackingUpdate {
  orderId: string;
  orderRef: string;
  leg: DeliveryLeg; // mirrors DeliveryTracking.tsx's internal `Phase`

  rider: {
    id: string;
    firstName: string;
    phoneNumber: string;
    photoUrl?: string;
    vehicleLabel?: string; // e.g. "Bike · GR 1234-20"
  };

  location: {
    lat: number;
    lng: number;
    headingDegrees: number;
    accuracyMeters?: number;
    updatedAt: string; // staleness check: if this is far behind `sentAt`, show "reconnecting"
  };

  // Road-snapped path for the rider's current leg only — same shape
  // utils/routing.ts's fetchRoadRoute returns — so the customer sees the
  // same polyline the rider does, not a straight line through buildings.
  routeToNextStop: Array<{ lat: number; lng: number }>;

  etaMinutes?: number;
  distanceRemainingMeters?: number;
}
