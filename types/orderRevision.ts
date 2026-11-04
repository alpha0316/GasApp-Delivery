import { CylinderSize, OrderIssueReason } from './order';

// Stand-ins for enums referenced by RiderDispatchPayload but not yet
// defined anywhere in this codebase — align these with the backend's
// actual definitions once they exist; 'needs_customer_update' is the new
// value this flow introduces.
export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'picked_up'
  | 'in_progress'
  | 'needs_customer_update'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

// ---------------------------------------------------------------------
// 1. Rider flags the order (ReportOrderIssueModal) -> backend fans this
//    out to the customer app as a push notification + in-app payload.
// ---------------------------------------------------------------------
export interface OrderIssueNotification {
  orderId: string;
  orderRef: string;
  issueId: string; // identifies this specific flag/revision cycle
  reasons: OrderIssueReason[];
  riderNote?: string; // the rider's free-text description

  reportedBy: {
    riderId: string;
    firstName: string;
    phoneNumber: string;
  };
  reportedAt: string; // ISO timestamp

  // What the customer is allowed to change, derived server-side from
  // `reasons` so the client never has to re-encode that business logic
  // (e.g. wrong_pickup -> delivery editable, wrong_size/no_lpg -> items).
  editable: {
    items: boolean;
    delivery: boolean;
  };

  // Snapshot of the order as it stands right now, so the customer app can
  // render "current" state and diff against whatever they change it to.
  current: {
    items: Array<{
      size: CylinderSize;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }>;
    delivery: {
      label: string;
      address?: string;
      lat: number;
      lng: number;
    };
    pricing: {
      currency: string;
      gasAmount: number;
      distanceFee: number;
      serviceFee: number;
      total: number;
    };
    paymentMethod: 'cash' | 'paystack';
    paymentStatus: PaymentStatus;
  };

  // Prices for whichever station will actually fulfill this (may differ
  // from the original if station_closed/no_lpg triggered a reassignment),
  // so the customer's edits price correctly without another round trip.
  availableSizes: Array<{
    size: CylinderSize;
    unitPrice: number;
  }>;

  respondBy: string; // ISO timestamp the rider is waiting until
  onNoResponse: 'auto_cancel' | 'keep_waiting';
}

// ---------------------------------------------------------------------
// 2. Customer submits their fix from the edit screen.
// ---------------------------------------------------------------------
export interface OrderRevisionRequest {
  orderId: string;
  issueId: string; // ties back to the OrderIssueNotification being resolved

  items?: Array<{
    size: CylinderSize;
    quantity: number;
  }>;
  delivery?: {
    label: string;
    address?: string;
    lat: number;
    lng: number;
    riderInstructions?: string;
  };

  submittedAt: string;
}

// ---------------------------------------------------------------------
// 3. Backend recomputes pricing and pushes the resolution back to both
//    the customer (receipt-style confirmation) and the rider (unblocking
//    the 'flagged' order in their queue with a refreshed dispatch payload).
// ---------------------------------------------------------------------
export interface OrderRevisionResult {
  orderId: string;
  issueId: string;
  status: OrderStatus; // back to 'in_progress' once resolved

  items: Array<{
    size: CylinderSize;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  delivery: {
    label: string;
    address?: string;
    lat: number;
    lng: number;
  };
  pricing: {
    currency: string;
    gasAmount: number;
    distanceFee: number;
    serviceFee: number;
    total: number;
    previousTotal: number;
    difference: number; // total - previousTotal; negative = refund
  };

  // What the customer still owes/is owed as a result of the revision.
  paymentAction: 'none' | 'charge_additional' | 'refund';
  paymentStatus: PaymentStatus;

  resolvedAt: string;
}
