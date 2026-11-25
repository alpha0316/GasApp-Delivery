import type { IssueReason, OrderStatus, PaymentMethod } from '../lib/api/types';

// View models used by the screens. They are built from backend orders in
// features/orders/mappers.ts. Money fields are integer minor units (pesewas).
export type CylinderSize = 'Small' | 'Medium' | 'Large';

// One cylinder to fill: its size and the amount of gas, minor units.
export interface CylinderLine {
  size: CylinderSize;
  amount: number;
}

export type DeliveryStage = 'arrived' | 'filling' | 'completed';

export interface LatLng {
  latitude: number;
  longitude: number;
}

// Reasons a rider can flag an order with. A single report can carry more than one reason.
export type OrderIssueReason = IssueReason;

export interface Order {
  id: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  customerName: string;
  customerPhone: string;
  cylinderSize: CylinderSize;
  cylinderCount: number;
  amount: number;
  // Every cylinder in the order, one line each (2 small = 2 lines).
  cylinders: CylinderLine[];
  tip?: number;
  total: number;
  // Rider commission plus tip.
  earnings: number;
  fillingStationName: string;
  dropoffAddress: string;
  stationLocation: LatLng | null;
  customerLocation: LatLng;
  etaMinutes?: number;
  // True while this cash order's platform fee is reserved from the rider's wallet.
  platformFeeLocked: boolean;
}

export interface RecentOrder {
  id: string;
  customerName: string;
  area: string;
  size: CylinderSize;
  amount: number;
  status: 'completed' | 'cancelled';
  time: string;
}

export interface RiderStats {
  todayDeliveries: number;
  totalEarned: number;
  rating: number | null;
}

export type QueueOrderStatus = 'queued' | 'up_next' | 'collected' | 'filled' | 'delivered' | 'flagged';

export interface QueueOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  area: string;
  cylinderSize: CylinderSize;
  amount: number;
  // Every cylinder in the order, one line each.
  cylinders: CylinderLine[];
  tip?: number;
  estimatedEarnings: number;
  customerLocation: LatLng;
  status: QueueOrderStatus;
  // The filling station name and acceptance time, for the active-delivery
  // queue card. Empty/blank when the caller didn't have a stations list.
  stationName: string;
  createdAt: string;
}
