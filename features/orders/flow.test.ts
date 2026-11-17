import type { ApiOrder } from '../../lib/api/types';
import { advanceThrough, historyBucket, needsCashCall, phaseOf, statusPath } from './flow';

describe('phaseOf', () => {
  it('maps each active status to a leg', () => {
    expect(phaseOf('rider_assigned')).toBe('toUserPickup');
    expect(phaseOf('picked_up')).toBe('toStation');
    expect(phaseOf('filling')).toBe('toStation');
    expect(phaseOf('en_route_to_customer')).toBe('toUserDropoff');
  });

  it('returns null for a finished or unassigned order', () => {
    expect(phaseOf('delivered')).toBeNull();
    expect(phaseOf('awaiting_rider')).toBeNull();
  });
});

describe('statusPath', () => {
  it('lists every step between two statuses', () => {
    expect(statusPath('rider_assigned', 'filling')).toEqual(['picked_up', 'filling']);
    expect(statusPath('picked_up', 'en_route_to_customer')).toEqual(['filling', 'en_route_to_customer']);
    expect(statusPath('en_route_to_customer', 'delivered')).toEqual(['delivered']);
  });

  it('returns nothing when the order is already at or past the target', () => {
    expect(statusPath('filling', 'picked_up')).toEqual([]);
    expect(statusPath('filling', 'filling')).toEqual([]);
  });
});

describe('historyBucket', () => {
  it('buckets an order into pending, ongoing or completed', () => {
    expect(historyBucket('rider_assigned')).toBe('pending');
    expect(historyBucket('picked_up')).toBe('ongoing');
    expect(historyBucket('filling')).toBe('ongoing');
    expect(historyBucket('en_route_to_customer')).toBe('ongoing');
    expect(historyBucket('delivered')).toBe('completed');
    expect(historyBucket('cancelled')).toBe('completed');
    expect(historyBucket('refunded')).toBe('completed');
  });
});

describe('needsCashCall', () => {
  it('uses the server cashCollected flag', () => {
    expect(needsCashCall({ paymentMethod: 'cash', cashCollected: false })).toBe(true);
    expect(needsCashCall({ paymentMethod: 'cash' })).toBe(true);
    expect(needsCashCall({ paymentMethod: 'cash', cashCollected: true })).toBe(false);
    expect(needsCashCall({ paymentMethod: 'paystack', cashCollected: false })).toBe(false);
  });
});

describe('advanceThrough', () => {
  const start = { id: 'o1', status: 'rider_assigned' } as ApiOrder;

  it('names the failed status and keeps earlier steps applied', async () => {
    const sent: string[] = [];
    const send = jest.fn(async (status: string) => {
      if (status === 'filling') throw new Error('Conflict');
      sent.push(status);
      return { ...start, status } as ApiOrder;
    });
    await expect(advanceThrough(start, 'en_route_to_customer', send)).rejects.toThrow(
      'Could not move the order to filling: Conflict'
    );
    expect(sent).toEqual(['picked_up']);
  });

  it('returns the last order when every step works', async () => {
    const result = await advanceThrough(start, 'filling', async (status) => ({ ...start, status }) as ApiOrder);
    expect(result.status).toBe('filling');
  });
});
