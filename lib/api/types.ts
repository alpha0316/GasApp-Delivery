// Shapes of the backend JSON. Source: gasapp-backend/docs/API.md and FRONTEND_INTEGRATION.md.
export type Role = 'customer' | 'rider' | 'admin';
export type CylinderSize = 'small' | 'medium' | 'large';
export type PaymentMethod = 'paystack' | 'cash';
export type VehicleType = 'motorbike' | 'tricycle' | 'car' | 'bicycle';
export type RiderStatus = 'offline' | 'available' | 'on_delivery';

export type OrderStatus =
  | 'pending_payment'
  | 'awaiting_rider'
  | 'rider_assigned'
  | 'picked_up'
  | 'filling'
  | 'en_route_to_customer'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

// Statuses a rider may send with PATCH /rider/orders/:id/status.
export type RiderTargetStatus = 'picked_up' | 'filling' | 'en_route_to_customer' | 'delivered';

export type IssueReason = 'wrong_size' | 'wrong_pickup' | 'station_closed' | 'no_lpg' | 'other';

export interface GeoPoint {
  type: 'Point';
  coordinates: [lng: number, lat: number];
}

export interface User {
  id: string;
  role: Role;
  phoneNumber?: string;
  email?: string;
  firstName: string;
  lastName: string;
  isApproved: boolean;
  riderStatus: RiderStatus;
  vehicleType?: VehicleType;
  plateNumber?: string;
  photoUrl?: string;
  areaId?: string;
  cylinderCapacity?: number;
  maxConcurrentOrders?: number;
  activeOrderCount: number;
  rating: number | null;
  // Minor units (pesewas). The float that guarantees GasApp's commission on
  // cash orders: see lib/pricing/feeSchedule.ts.
  walletBalance?: number;
  // Sum of platform fees reserved against accepted, not-yet-delivered cash orders.
  walletLocked?: number;
  // Unexcused-cancellation strikes within the last 7 days (section 3.3).
  strikes?: number;
  // ISO timestamps of those strikes, for the rolling 7-day window.
  strikeHistory?: string[];
  // True once 3 unexcused cancellations land within 7 days: cannot go online until an admin resolves it.
  suspended?: boolean;
}

export interface Area {
  id: string;
  name: string;
  center: GeoPoint;
  radiusKm: number;
}

export interface Station {
  id: string;
  name: string;
  location: GeoPoint;
  areaId?: string;
  isActive: boolean;
}

export interface Pricing {
  gasAmount: number;
  gasTotal: number;
  distanceFee: number;
  serviceFee: number;
  tip: number;
  total: number;
  currency: string;
}

export interface CustomerContact {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface ApiOrder {
  id: string;
  // Populated with contact fields on GET /rider/orders. A plain id in the pool list.
  customerId: string | CustomerContact;
  cylinderSize: CylinderSize;
  cylinderCount: number;
  isFullFill: boolean;
  deliveryAddress: { label: string; lat: number; lng: number };
  riderInstructions: string;
  stationId: string;
  distanceKm: number;
  pricing: Pricing;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  riderCommission?: number;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
  // Rider order payloads only: true when the payment status is cash_collected.
  cashCollected?: boolean;
  // True while this cash order's platform fee is reserved from the rider's
  // wallet (locked on accept, released on cancel, deducted on delivery).
  platformFeeLocked?: boolean;
  // Pool list only
  pickupDistanceKm?: number;
  estimatedEarnings?: number;
}

export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  amount: number;
  currency: string;
  status: string;
}

export interface OrderIssueReport {
  id: string;
  orderId: string;
  riderId: string;
  reasons: IssueReason[];
  description?: string;
  status: string;
  createdAt: string;
}

export interface EarningsTotals {
  payoutPending: number;
  payoutPaid: number;
  cashCollected: number;
  totalEarned: number;
  totalDeliveries: number;
  todayDeliveries: number;
  rating: number | null;
  currency: string;
}

export interface CapacityRequest {
  id: string;
  requestedLimit: number;
  reason?: string;
  status: string;
  createdAt: string;
}

export interface RouteResult {
  distanceKm: number;
  durationSeconds: number;
  geometry: { type: 'LineString'; coordinates: [number, number][] };
}
