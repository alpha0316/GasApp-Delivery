import type { ApiOrder, OrderStatus } from '../../lib/api/types';
import { deriveBatch, flaggedIdsFrom } from './batch';

const order = (id: string, status: OrderStatus): ApiOrder => ({
  id,
  customerId: { id: `c-${id}`, firstName: 'Ama', lastName: 'Boateng', phoneNumber: '233241234567' },
  cylinderSize: 'small',
  cylinderCount: 1,
  isFullFill: true,
  deliveryAddress: { label: 'Osu', lat: 5.6, lng: -0.18 },
  riderInstructions: '',
  stationId: 's1',
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
    expect(batch.queue.map((o) => o.status)).toEqual(['up_next', 'queued']);
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
