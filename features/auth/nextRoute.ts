import type { User } from '../../lib/api/types';

export type OnboardingRoute = '/name' | '/photo' | '/vehicle' | '/home';

// Where a signed-in rider goes next: name -> photo -> vehicle -> home.
export function nextRoute(user: User): OnboardingRoute {
  if (!user.firstName.trim()) return '/name';
  if (!user.photoUrl) return '/photo';
  if (!user.vehicleType || !user.plateNumber || !user.areaId) return '/vehicle';
  return '/home';
}
