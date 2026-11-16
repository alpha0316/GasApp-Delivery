import type { ApiOrder, OrderStatus, RiderTargetStatus } from '../../lib/api/types';

// The backend moves an order one step at a time, in this order.
const CHAIN: OrderStatus[] = ['rider_assigned', 'picked_up', 'filling', 'en_route_to_customer', 'delivered'];

export const ACTIVE_STATUSES: OrderStatus[] = ['rider_assigned', 'picked_up', 'filling', 'en_route_to_customer'];

export const isActiveStatus = (status: OrderStatus) => ACTIVE_STATUSES.includes(status);

export type HistoryBucket = 'pending' | 'ongoing' | 'completed';

// Groups an order for the order-history list: accepted but not yet started,
// actively being worked, or finished (delivered, cancelled or refunded).
export function historyBucket(status: OrderStatus): HistoryBucket {
  if (status === 'rider_assigned') return 'pending';
  if (status === 'picked_up' || status === 'filling' || status === 'en_route_to_customer') return 'ongoing';
  return 'completed';
}

export type Phase = 'toUserPickup' | 'toStation' | 'toUserDropoff';

// rider_assigned: rider goes to the customer to collect the empty cylinder.
// picked_up / filling: rider goes to, and fills at, the filling station.
// en_route_to_customer: rider returns the full cylinder.
export function phaseOf(status: OrderStatus): Phase | null {
  if (status === 'rider_assigned') return 'toUserPickup';
  if (status === 'picked_up' || status === 'filling') return 'toStation';
  if (status === 'en_route_to_customer') return 'toUserDropoff';
  return null;
}

// Statuses to send, in order, to move an order from one status to another.
export function statusPath(from: OrderStatus, to: RiderTargetStatus): RiderTargetStatus[] {
  const fromIndex = CHAIN.indexOf(from);
  const toIndex = CHAIN.indexOf(to);
  if (fromIndex === -1 || toIndex === -1 || toIndex <= fromIndex) return [];
  return CHAIN.slice(fromIndex + 1, toIndex + 1) as RiderTargetStatus[];
}

// A cash order needs the cash-collected call until the server says it is done.
export const needsCashCall = (order: Pick<ApiOrder, 'paymentMethod' | 'cashCollected'>) =>
  order.paymentMethod === 'cash' && !order.cashCollected;

// Sends each missing status in order. Earlier steps stay applied when a later
// one fails; the error names the failed status.
export async function advanceThrough(
  order: ApiOrder,
  target: RiderTargetStatus,
  send: (status: RiderTargetStatus) => Promise<ApiOrder>
): Promise<ApiOrder> {
  let latest = order;
  for (const status of statusPath(order.status, target)) {
    try {
      latest = await send(status);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Could not move the order to ${status}: ${reason}`, { cause: error });
    }
  }
  return latest;
}
