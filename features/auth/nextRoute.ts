import type { User } from '../../lib/api/types';

export type OnboardingRoute = '/name' | '/vehicle' | '/pending' | '/photo' | '/home';

// Where a signed-in rider goes next. The photo upload endpoint works for
// approved riders only, so the photo step comes after approval.
export function nextRoute(user: User): OnboardingRoute {
  if (!user.firstName.trim()) return '/name';
  if (!user.vehicleType || !user.plateNumber || !user.areaId) return '/vehicle';
  if (!user.isApproved) return '/pending';
  if (!user.photoUrl) return '/photo';
  return '/home';
}

const APPROVED_ONLY_ROUTES = ['home', 'tracking', 'filling', 'batch', 'photo', 'earnings', 'profile'];

// True when a rider who lost approval (suspended) is still on a screen for approved riders.
export function mustLeaveForPending(user: User, firstSegment: string | undefined): boolean {
  return nextRoute(user) === '/pending' && firstSegment !== undefined && APPROVED_ONLY_ROUTES.includes(firstSegment);
}
