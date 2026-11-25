import type { ApiOrder } from '../../lib/api/types';
import { cylinderLines, toOrderView, toRecentOrder } from './mappers';

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

describe('cylinderLines', () => {
  const pricing = { gasAmount: 0, gasTotal: 10001, distanceFee: 0, serviceFee: 0, tip: 0, total: 0, currency: 'GHS' };

  it('lists each cylinder with its own amount when the order has a breakdown', () => {
    const lines = cylinderLines({
      cylinderSize: 'small',
      cylinderCount: 2,
      pricing,
      cylinders: [
        { size: 'small', fillAmount: 3000 },
        { size: 'medium', fillAmount: 7000 },
      ],
    });
    expect(lines).toEqual([
      { size: 'Small', amount: 3000 },
      { size: 'Medium', amount: 7000 },
    ]);
  });

  it('splits the gas total evenly without one, keeping every pesewa', () => {
    const lines = cylinderLines({ cylinderSize: 'small', cylinderCount: 2, pricing });
    expect(lines).toEqual([
      { size: 'Small', amount: 5000 },
      { size: 'Small', amount: 5001 },
    ]);
  });
});
