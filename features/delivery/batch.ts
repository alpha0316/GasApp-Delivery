import type { ApiOrder } from '../../lib/api/types';
import type { QueueOrder } from '../../types/order';
import { toQueueOrder } from '../orders/mappers';

export interface BatchState {
  // Every order of the batch that can still be shown, in batch order.
  queue: QueueOrder[];
  // Orders the rider still has to deliver (not delivered, not flagged, not cancelled).
  remaining: ApiOrder[];
  // The order to deliver now. Only set once the rider has left the station.
  upNext: ApiOrder | null;
  delivering: boolean;
  allDone: boolean;
}

const isGone = (order: ApiOrder) => order.status === 'cancelled' || order.status === 'refunded';

// Derives the batch screen state from the server orders. A flagged order stays
// active on the server, but the rider skips it.
export function deriveBatch(orders: ApiOrder[], flaggedIds: Record<string, true>): BatchState {
  const visible = orders.filter((order) => !isGone(order));
  const remaining = visible.filter((order) => order.status !== 'delivered' && !flaggedIds[order.id]);
  const upNext = remaining.find((order) => order.status === 'en_route_to_customer') ?? null;

  const queue = visible.map((order) => {
    if (order.status === 'delivered') return toQueueOrder(order, 'delivered');
    if (flaggedIds[order.id]) return toQueueOrder(order, 'flagged');
    if (upNext && order.id === upNext.id) return toQueueOrder(order, 'up_next');
    return toQueueOrder(order, 'queued');
  });

  return {
    queue,
    remaining,
    upNext,
    delivering: upNext !== null,
    allDone: visible.length > 0 && remaining.length === 0,
  };
}

// Orders where the rider has an open report. The server holds the reports.
export function flaggedIdsFrom(entries: { orderId: string; issues: { status: string }[] }[]): Record<string, true> {
  const flagged: Record<string, true> = {};
  for (const { orderId, issues } of entries) {
    if (issues.some((issue) => issue.status === 'open')) flagged[orderId] = true;
  }
  return flagged;
}
