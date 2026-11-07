import type { ApiOrder } from '../../lib/api/types';
import { toOrderView, toRecentOrder } from './mappers';

const base: ApiOrder = {
  id: 'o1',
  customerId: 'c1',
  cylinderSize: 'medium',
  cylinderCount: 2,
  isFullFill: true,
  deliveryAddress: { label: 'Adum', lat: 5.61, lng: -0.18 },
  riderInstructions: '',
  stationId: 's1',
  distanceKm: 3,
  pricing: { gasAmount: 15000, gasTotal: 30000, distanceFee: 600, serviceFee: 2000, tip: 500, total: 33100, currency: 'GHS' },
  paymentMethod: 'paystack',
  status: 'awaiting_rider',
  createdAt: '2026-11-05T08:00:00.000Z',
  updatedAt: '2026-11-05T08:00:00.000Z',
  estimatedEarnings: 1500,
};

describe('toOrderView', () => {
  it('reads the station and keeps money in minor units', () => {
    const station = { id: 's1', name: 'Total - Osu', location: { type: 'Point' as const, coordinates: [-0.187, 5.6037] as [number, number] }, isActive: true };
    const view = toOrderView(base, [station]);
    expect(view.fillingStationName).toBe('Total - Osu');
    expect(view.stationLocation).toEqual({ latitude: 5.6037, longitude: -0.187 });
    expect(view.amount).toBe(30000);
    expect(view.earnings).toBe(1500);
    expect(view.cylinderSize).toBe('Medium');
  });

  it('uses a placeholder name while the pool hides customer contact', () => {
    expect(toOrderView(base, undefined).customerName).toBe('Customer');
  });
});

describe('toRecentOrder', () => {
  it('keeps only delivered and cancelled orders', () => {
    expect(toRecentOrder(base)).toBeNull();
    expect(toRecentOrder({ ...base, status: 'cancelled' })?.time).toBe('Cancelled');
    expect(toRecentOrder({ ...base, status: 'delivered', deliveredAt: '2026-11-05T09:12:00.000Z' })?.status).toBe('completed');
  });
});
