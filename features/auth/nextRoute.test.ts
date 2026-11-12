import type { User } from '../../lib/api/types';
import { splitFullName } from './names';
import { mustLeaveForPending, nextRoute } from './nextRoute';

const rider: User = {
  id: 'r1',
  role: 'rider',
  firstName: 'Kofi',
  lastName: 'Mensah',
  isApproved: true,
  riderStatus: 'offline',
  vehicleType: 'motorbike',
  plateNumber: 'GR1234',
  areaId: 'a1',
  photoUrl: 'https://example.com/p.jpg',
  activeOrderCount: 0,
  rating: null,
};

describe('nextRoute', () => {
  it('walks a new rider through onboarding in order', () => {
    expect(nextRoute({ ...rider, firstName: '' })).toBe('/name');
    expect(nextRoute({ ...rider, plateNumber: undefined })).toBe('/vehicle');
    expect(nextRoute({ ...rider, isApproved: false })).toBe('/pending');
    expect(nextRoute({ ...rider, photoUrl: undefined })).toBe('/photo');
    expect(nextRoute(rider)).toBe('/home');
  });
});

describe('mustLeaveForPending', () => {
  it('sends a suspended rider off the approved-only screens', () => {
    const suspended = { ...rider, isApproved: false };
    expect(nextRoute(suspended)).toBe('/pending');
    expect(mustLeaveForPending(suspended, 'home')).toBe(true);
    expect(mustLeaveForPending(suspended, 'tracking')).toBe(true);
    expect(mustLeaveForPending(suspended, 'pending')).toBe(false);
    expect(mustLeaveForPending(rider, 'home')).toBe(false);
  });
});

describe('splitFullName', () => {
  it('splits the first name from the rest', () => {
    expect(splitFullName('  Kofi  Owusu Mensah ')).toEqual({ firstName: 'Kofi', lastName: 'Owusu Mensah' });
    expect(splitFullName('Ama')).toEqual({ firstName: 'Ama', lastName: '' });
  });
});
