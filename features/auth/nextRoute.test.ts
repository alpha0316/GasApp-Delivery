import type { User } from '../../lib/api/types';
import { splitFullName } from './names';
import { nextRoute } from './nextRoute';

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
  it('walks a new rider through onboarding in order: name -> photo -> vehicle -> home', () => {
    expect(nextRoute({ ...rider, firstName: '' })).toBe('/name');
    expect(nextRoute({ ...rider, photoUrl: undefined })).toBe('/photo');
    expect(nextRoute({ ...rider, plateNumber: undefined })).toBe('/vehicle');
    expect(nextRoute(rider)).toBe('/home');
  });
});

describe('splitFullName', () => {
  it('splits the first name from the rest', () => {
    expect(splitFullName('  Kofi  Owusu Mensah ')).toEqual({ firstName: 'Kofi', lastName: 'Owusu Mensah' });
    expect(splitFullName('Ama')).toEqual({ firstName: 'Ama', lastName: '' });
  });
});
