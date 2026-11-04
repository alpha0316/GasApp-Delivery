export type CylinderSize = 'Small' | 'Medium' | 'Large';

export type DeliveryStage = 'arrived' | 'filling' | 'completed';

export interface LatLng {
  latitude: number;
  longitude: number;
}

// Reasons a rider can flag an order back to the customer for changes,
// e.g. the size/product no longer matches what's actually available.
// A single flag can carry more than one reason at once.
export type OrderIssueReason = 'wrong_size' | 'wrong_pickup' | 'station_closed' | 'no_lpg' | 'other';

export interface OrderIssue {
  reasons: OrderIssueReason[];
  description?: string;
  reportedAt: string;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  cylinderSize: CylinderSize;
  cylinderCount: number;
  amount: number;
  tip?: number;
  fillingStationName: string;
  dropoffAddress: string;
  pickupLocation: LatLng;
  dropoffLocation: LatLng;
  etaMinutes?: number;
  issue?: OrderIssue;
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
  rating: number;
}

export type QueueOrderStatus = 'queued' | 'up_next' | 'filled' | 'delivered' | 'flagged';

export interface QueueOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  area: string;
  cylinderSize: CylinderSize;
  amount: number;
  tip?: number;
  dropoffLocation: LatLng;
  status: QueueOrderStatus;
  issue?: OrderIssue;
}
