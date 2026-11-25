import type { ApiOrder, Station } from '../../lib/api/types';
import type { QueueOrder } from '../../types/order';
import { toQueueOrder } from '../orders/mappers';

export interface BatchState {
  // Every order of the batch that can still be shown, in batch order.
  queue: QueueOrder[];
  // Orders the rider still has to deliver (not delivered, not flagged, not cancelled).
  remaining: ApiOrder[];
  // The next customer to collect an empty cylinder from. The rider collects
  // from every customer before heading to the filling station.
  nextPickup: ApiOrder | null;
  collecting: boolean;
  // Collected cylinders still to fill. Customers may pick different filling
  // stations, so the rider fills one station's orders at a time: these are
  // the orders for the station to visit now (the first unfilled order's
  // station, in batch order). Empty outside the station leg.
  stationOrders: ApiOrder[];
  stationId: string | null;
  // Stations in the batch, in visiting order, and how many are still to visit.
  stationIds: string[];
  stationsLeft: number;
  // The order to deliver now. Only set once the rider has left the station.
  upNext: ApiOrder | null;
  delivering: boolean;
  allDone: boolean;
}

const isGone = (order: ApiOrder) => order.status === 'cancelled' || order.status === 'refunded';

// Derives the batch screen state from the server orders. A flagged order stays
// active on the server, but the rider skips it.
export function deriveBatch(orders: ApiOrder[], flaggedIds: Record<string, true>, stations?: Station[]): BatchState {
  const visible = orders.filter((order) => !isGone(order));
  const remaining = visible.filter((order) => order.status !== 'delivered' && !flaggedIds[order.id]);
  const unfilled = remaining.filter((o) => o.status === 'picked_up' || o.status === 'filling');
  const toCollect = remaining.filter((o) => o.status === 'rider_assigned');
  const filled = remaining.filter((o) => o.status === 'en_route_to_customer');

  // Phase order: collect every cylinder, then fill station by station, then
  // deliver. With nothing left to fill, full cylinders already on board are
  // delivered before collecting anything new.
  const phase: 'collect' | 'fill' | 'deliver' | 'done' =
    unfilled.length > 0
      ? toCollect.length > 0
        ? 'collect'
        : 'fill'
      : filled.length > 0
        ? 'deliver'
        : toCollect.length > 0
          ? 'collect'
          : 'done';

  const nextPickup = phase === 'collect' ? toCollect[0] : null;
  const upNext = phase === 'deliver' ? filled[0] : null;
  const stationId = phase === 'fill' ? unfilled[0].stationId : null;
  const stationOrders = stationId ? unfilled.filter((o) => o.stationId === stationId) : [];
  const stationIds = [...new Set(visible.filter((o) => !flaggedIds[o.id]).map((o) => o.stationId))];
  const stationsLeft = new Set(unfilled.concat(toCollect).map((o) => o.stationId)).size;

  const queue = visible.map((order) => {
    if (order.status === 'delivered') return toQueueOrder(order, 'delivered', stations);
    if (flaggedIds[order.id]) return toQueueOrder(order, 'flagged', stations);
    if (upNext && order.id === upNext.id) return toQueueOrder(order, 'up_next', stations);
    if (nextPickup && order.id === nextPickup.id) return toQueueOrder(order, 'up_next', stations);
    if (order.status === 'en_route_to_customer') return toQueueOrder(order, 'filled', stations);
    if (order.status !== 'rider_assigned') return toQueueOrder(order, 'collected', stations);
    return toQueueOrder(order, 'queued', stations);
  });

  return {
    queue,
    remaining,
    nextPickup,
    collecting: nextPickup !== null,
    stationOrders,
    stationId,
    stationIds,
    stationsLeft,
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
