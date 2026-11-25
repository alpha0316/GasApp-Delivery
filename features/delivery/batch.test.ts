import type { ApiOrder, OrderStatus } from '../../lib/api/types';
import { deriveBatch, flaggedIdsFrom } from './batch';

const order = (id: string, status: OrderStatus, stationId = 's1'): ApiOrder => ({
  id,
  customerId: { id: `c-${id}`, firstName: 'Ama', lastName: 'Boateng', phoneNumber: '233241234567' },
  cylinderSize: 'small',
  cylinderCount: 1,
  isFullFill: true,
  deliveryAddress: { label: 'Osu', lat: 5.6, lng: -0.18 },
  riderInstructions: '',
  stationId,
  distanceKm: 2,
  pricing: { gasAmount: 8000, gasTotal: 8000, distanceFee: 500, serviceFee: 2000, tip: 1000, total: 11500, currency: 'GHS' },
  paymentMethod: 'cash',
  status,
  riderCommission: 1000,
  createdAt: '2026-11-05T08:00:00.000Z',
  updatedAt: '2026-11-05T08:00:00.000Z',
});

describe('deriveBatch', () => {
  it('is at the station stage until an order is on its way to the customer', () => {
    const batch = deriveBatch([order('a', 'filling'), order('b', 'picked_up')], {});
    expect(batch.delivering).toBe(false);
    expect(batch.upNext).toBeNull();
    expect(batch.remaining).toHaveLength(2);
  });

  it('delivers the first order that is en route and queues the rest', () => {
    const batch = deriveBatch([order('a', 'en_route_to_customer'), order('b', 'en_route_to_customer')], {});
    expect(batch.delivering).toBe(true);
    expect(batch.queue.map((o) => o.status)).toEqual(['up_next', 'filled']);
  });

  it('collects from every customer before the station', () => {
    const batch = deriveBatch([order('a', 'picked_up'), order('b', 'rider_assigned'), order('c', 'rider_assigned')], {});
    expect(batch.collecting).toBe(true);
    expect(batch.nextPickup?.id).toBe('b');
    expect(batch.queue.map((o) => o.status)).toEqual(['collected', 'up_next', 'queued']);
  });

  it('heads to the station once every cylinder is collected', () => {
    const batch = deriveBatch([order('a', 'picked_up'), order('b', 'filling')], {});
    expect(batch.collecting).toBe(false);
    expect(batch.nextPickup).toBeNull();
  });

  it('skips flagged orders and finishes when nothing is left', () => {
    const batch = deriveBatch([order('a', 'delivered'), order('b', 'en_route_to_customer')], { b: true });
    expect(batch.queue.map((o) => o.status)).toEqual(['delivered', 'flagged']);
    expect(batch.allDone).toBe(true);
  });

  it('drops cancelled orders', () => {
    const batch = deriveBatch([order('a', 'cancelled'), order('b', 'filling')], {});
    expect(batch.queue.map((o) => o.id)).toEqual(['b']);
  });
});

describe('deriveBatch with several filling stations', () => {
  it('fills one station at a time, in batch order', () => {
    const batch = deriveBatch(
      [order('a', 'picked_up', 'spintex'), order('b', 'picked_up', 'labadi'), order('c', 'picked_up', 'spintex')],
      {}
    );
    expect(batch.stationId).toBe('spintex');
    expect(batch.stationOrders.map((o) => o.id)).toEqual(['a', 'c']);
    expect(batch.stationIds).toEqual(['spintex', 'labadi']);
    expect(batch.stationsLeft).toBe(2);
    expect(batch.delivering).toBe(false);
  });

  it('goes on to the next station before delivering anything', () => {
    const batch = deriveBatch(
      [order('a', 'en_route_to_customer', 'spintex'), order('b', 'picked_up', 'labadi'), order('c', 'en_route_to_customer', 'spintex')],
      {}
    );
    expect(batch.stationId).toBe('labadi');
    expect(batch.stationOrders.map((o) => o.id)).toEqual(['b']);
    expect(batch.stationsLeft).toBe(1);
    expect(batch.upNext).toBeNull();
  });

  it('delivers once every station is done', () => {
    const batch = deriveBatch(
      [order('a', 'en_route_to_customer', 'spintex'), order('b', 'en_route_to_customer', 'labadi')],
      {}
    );
    expect(batch.delivering).toBe(true);
    expect(batch.upNext?.id).toBe('a');
    expect(batch.stationsLeft).toBe(0);
  });
});

describe('flaggedIdsFrom', () => {
  it('flags only orders with an open report from the server', () => {
    const flagged = flaggedIdsFrom([
      { orderId: 'a', issues: [{ status: 'open' }] },
      { orderId: 'b', issues: [{ status: 'handled' }] },
      { orderId: 'c', issues: [] },
    ]);
    expect(flagged).toEqual({ a: true });
  });
});
