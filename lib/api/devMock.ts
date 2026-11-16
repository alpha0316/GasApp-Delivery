import * as SecureStore from 'expo-secure-store';
import { isValidCancelReason, type CancelReason } from '../orders/cancelReasons';
import { STRIKE_WINDOW_MS, SUSPENSION_STRIKE_THRESHOLD } from '../orders/strikes';
import { deliveryFeeForDistanceKm, PLATFORM_FEE_BY_SIZE } from '../pricing/feeSchedule';
import type { Area, ApiOrder, CapacityRequest, EarningsTotals, Station, User, VehicleType } from './types';

// TEMP: flip to false to hit the real backend again. While true, every
// request made through lib/api/client.ts's api() is answered locally so the
// onboarding flow (phone -> otp -> name -> photo -> vehicle -> home) and the
// home screen can be clicked through with no server running.
export const MOCK_API = true;

const MOCK_DELAY_MS = 300;

const DEFAULT_RIDER: User = {
  id: 'dev-rider',
  role: 'rider',
  phoneNumber: '',
  firstName: '',
  lastName: '',
  isApproved: false,
  riderStatus: 'available',
  vehicleType: undefined,
  plateNumber: undefined,
  photoUrl: undefined,
  areaId: undefined,
  cylinderCapacity: 6,
  maxConcurrentOrders: 3,
  activeOrderCount: 0,
  rating: null,
  walletBalance: 10000,
  // Pre-seeded to match order-active-1 below, a cash order already accepted.
  walletLocked: 1200,
};

let rider: User = DEFAULT_RIDER;

// The sign-in token survives JS reloads (it's in SecureStore), but this
// module's in-memory rider does not. Without persisting it too, a reload
// mid-onboarding keeps the token but resets the rider to blank, which
// nextRoute reads as "needs a name" again, sending the rider backward even
// though they're still signed in - a loop that never reaches home.
const MOCK_RIDER_KEY = 'dev-mock-rider';

let hydrated = false;
const ready: Promise<void> = (async () => {
  try {
    const stored = await SecureStore.getItemAsync(MOCK_RIDER_KEY);
    if (stored) rider = JSON.parse(stored) as User;
  } catch {
    // Corrupt or inaccessible; keep the in-memory default.
  } finally {
    hydrated = true;
  }
})();

function setRider(next: User): User {
  rider = next;
  void SecureStore.setItemAsync(MOCK_RIDER_KEY, JSON.stringify(rider)).catch(() => {});
  return rider;
}

// Mirrors the real sign-out boundary: starts the next test run as a brand
// new, un-onboarded rider instead of resuming whatever state was saved.
export function mockResetRider(): void {
  rider = DEFAULT_RIDER;
  void SecureStore.deleteItemAsync(MOCK_RIDER_KEY).catch(() => {});
}

// Mirrors features/pool/vehicleMode.ts's single-vs-batch split: a
// motorbike/bicycle rider works one order at a time, a tricycle or car
// rider works a batch queue of several.
const MAX_CONCURRENT_ORDERS: Record<VehicleType, number> = {
  motorbike: 1,
  bicycle: 1,
  tricycle: 3,
  car: 4,
};

const AREAS: Area[] = [
  { id: 'area-accra', name: 'Accra', center: { type: 'Point', coordinates: [-0.187, 5.6037] }, radiusKm: 15 },
  { id: 'area-tema', name: 'Tema', center: { type: 'Point', coordinates: [-0.0166, 5.6698] }, radiusKm: 12 },
  { id: 'area-kumasi', name: 'Kumasi', center: { type: 'Point', coordinates: [-1.6244, 6.6885] }, radiusKm: 18 },
];

const STATIONS: Station[] = [
  {
    id: 'station-spintex',
    name: 'TotalEnergies - Spintex',
    location: { type: 'Point', coordinates: [-0.1489, 5.6207] },
    areaId: 'area-accra',
    isActive: true,
  },
  {
    id: 'station-labadi',
    name: 'Goil - Labadi',
    location: { type: 'Point', coordinates: [-0.1569, 5.5602] },
    areaId: 'area-accra',
    isActive: true,
  },
];

const isoMinutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

function makePricing(gasTotal: number, distanceFee: number, serviceFee: number, tip: number) {
  return { gasAmount: gasTotal, gasTotal, distanceFee, serviceFee, tip, total: gasTotal + distanceFee + serviceFee + tip, currency: 'GHS' };
}

// Orders waiting to be claimed from the pool. The pool list has no customer
// contact info, per the real API (it appears only after accept).
let poolOrders: ApiOrder[] = [
  {
    id: 'order-pool-1',
    customerId: 'customer-pool-1',
    cylinderSize: 'medium',
    cylinderCount: 1,
    isFullFill: true,
    deliveryAddress: { label: 'East Legon, Accra', lat: 5.6494, lng: -0.1538 },
    riderInstructions: 'Call when you arrive at the gate.',
    stationId: 'station-spintex',
    distanceKm: 4.1,
    pricing: makePricing(4500, deliveryFeeForDistanceKm(4.1), PLATFORM_FEE_BY_SIZE.medium, 500),
    paymentMethod: 'paystack',
    status: 'awaiting_rider',
    createdAt: isoMinutesAgo(2),
    updatedAt: isoMinutesAgo(2),
    pickupDistanceKm: 1.6,
    estimatedEarnings: 1400,
  },
  {
    id: 'order-pool-2',
    customerId: 'customer-pool-2',
    cylinderSize: 'small',
    cylinderCount: 2,
    isFullFill: false,
    deliveryAddress: { label: 'Dzorwulu, Accra', lat: 5.5901, lng: -0.1931 },
    riderInstructions: 'Leave with the security man if no answer.',
    stationId: 'station-labadi',
    distanceKm: 2.8,
    pricing: makePricing(3200, deliveryFeeForDistanceKm(2.8), PLATFORM_FEE_BY_SIZE.small, 0),
    paymentMethod: 'cash',
    status: 'awaiting_rider',
    createdAt: isoMinutesAgo(6),
    updatedAt: isoMinutesAgo(6),
    pickupDistanceKm: 2.2,
    estimatedEarnings: 900,
  },
];

// Orders already on the rider's own list: one in progress, two finished.
let riderOrders: ApiOrder[] = [
  {
    id: 'order-active-1',
    customerId: { id: 'customer-active-1', firstName: 'Kwabena', lastName: 'Owusu', phoneNumber: '+233501234567' },
    cylinderSize: 'large',
    cylinderCount: 1,
    isFullFill: true,
    deliveryAddress: { label: 'Airport Residential, Accra', lat: 5.605, lng: -0.1719 },
    riderInstructions: 'Blue gate, ring the bell twice.',
    stationId: 'station-spintex',
    distanceKm: 3.4,
    pricing: makePricing(6000, deliveryFeeForDistanceKm(3.4), PLATFORM_FEE_BY_SIZE.large, 800),
    paymentMethod: 'cash',
    status: 'rider_assigned',
    riderCommission: 1800,
    createdAt: isoMinutesAgo(18),
    updatedAt: isoMinutesAgo(10),
    cashCollected: false,
    platformFeeLocked: true,
  },
  {
    id: 'order-done-1',
    customerId: { id: 'customer-done-1', firstName: 'Ama', lastName: 'Boateng', phoneNumber: '+233557654321' },
    cylinderSize: 'medium',
    cylinderCount: 1,
    isFullFill: true,
    deliveryAddress: { label: 'Osu, Accra', lat: 5.5558, lng: -0.1821 },
    riderInstructions: '',
    stationId: 'station-labadi',
    distanceKm: 2.1,
    pricing: makePricing(4500, deliveryFeeForDistanceKm(2.1), PLATFORM_FEE_BY_SIZE.medium, 1000),
    paymentMethod: 'paystack',
    status: 'delivered',
    riderCommission: 1300,
    createdAt: isoMinutesAgo(240),
    updatedAt: isoMinutesAgo(190),
    deliveredAt: isoMinutesAgo(190),
    cashCollected: false,
  },
  {
    id: 'order-done-2',
    customerId: { id: 'customer-done-2', firstName: 'Yaw', lastName: 'Mensah', phoneNumber: '+233244112233' },
    cylinderSize: 'small',
    cylinderCount: 1,
    isFullFill: false,
    deliveryAddress: { label: 'Adenta, Accra', lat: 5.7085, lng: -0.1016 },
    riderInstructions: '',
    stationId: 'station-spintex',
    distanceKm: 6.7,
    pricing: makePricing(2800, deliveryFeeForDistanceKm(6.7), PLATFORM_FEE_BY_SIZE.small, 0),
    paymentMethod: 'cash',
    status: 'cancelled',
    riderCommission: 0,
    createdAt: isoMinutesAgo(1500),
    updatedAt: isoMinutesAgo(1480),
  },
];

const CAPACITY_REQUESTS: CapacityRequest[] = [];

function earningsTotals(): EarningsTotals {
  const delivered = riderOrders.filter((order) => order.status === 'delivered');
  const cashCollected = delivered
    .filter((order) => order.paymentMethod === 'cash')
    .reduce((sum, order) => sum + (order.riderCommission ?? 0) + order.pricing.tip, 0);
  const totalEarned = delivered.reduce((sum, order) => sum + (order.riderCommission ?? 0) + order.pricing.tip, 0);
  return {
    payoutPending: totalEarned - cashCollected,
    payoutPaid: 0,
    cashCollected,
    totalEarned,
    totalDeliveries: delivered.length,
    todayDeliveries: delivered.length,
    rating: rider.rating,
    currency: 'GHS',
  };
}

function wait<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_DELAY_MS));
}

// Lets the photo screen's dev bypass button skip straight past picking and
// uploading a photo.
export function mockSetPhoto(): User {
  return setRider({ ...rider, photoUrl: 'https://placehold.co/200x200' });
}

// Matches "/rider/orders/:id/accept" style patterns against a real path,
// returning the captured params, or null when it doesn't match.
function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const keys: string[] = [];
  const regex = new RegExp(`^${pattern.replace(/:[^/]+/g, (segment) => {
    keys.push(segment.slice(1));
    return '([^/]+)';
  })}$`);
  const found = path.match(regex);
  if (!found) return null;
  const params: Record<string, string> = {};
  keys.forEach((key, index) => {
    params[key] = found[index + 1];
  });
  return params;
}

export async function mockApi<T>(
  path: string,
  method: string,
  body: unknown,
  query?: Record<string, string | number | undefined>
): Promise<T> {
  if (!hydrated) await ready;
  const match = (p: string) => path === p;

  if (match('/auth/otp/request') && method === 'POST') {
    return wait(undefined as T);
  }

  if (match('/auth/otp/verify') && method === 'POST') {
    const { target } = (body ?? {}) as { target?: string };
    setRider({ ...rider, phoneNumber: target ?? rider.phoneNumber });
    return wait({ token: 'dev-token', user: rider, isNewUser: true } as T);
  }

  if (match('/me') && method === 'GET') {
    return wait({ user: rider } as T);
  }

  if (match('/me') && method === 'PATCH') {
    const { firstName, lastName, email } = (body ?? {}) as { firstName?: string; lastName?: string; email?: string };
    setRider({
      ...rider,
      firstName: firstName ?? rider.firstName,
      lastName: lastName ?? rider.lastName,
      email: email ?? rider.email,
    });
    return wait({ user: rider } as T);
  }

  if (match('/areas') && method === 'GET') {
    return wait({ areas: AREAS } as T);
  }

  if (match('/rider/profile') && method === 'GET') {
    return wait({ rider, maxConcurrentOrders: rider.maxConcurrentOrders ?? 3 } as T);
  }

  if (match('/rider/profile') && method === 'PATCH') {
    const patch = body as Partial<User>;
    setRider({
      ...rider,
      ...patch,
      maxConcurrentOrders: patch.vehicleType ? MAX_CONCURRENT_ORDERS[patch.vehicleType] : rider.maxConcurrentOrders,
      // The vehicle step is the last one in the onboarding flow, so finishing
      // it is what "approves" the rider now that there's no separate wait.
      isApproved: patch.vehicleType ? true : rider.isApproved,
    });
    return wait({ rider } as T);
  }

  if (match('/rider/status') && method === 'PATCH') {
    const { status } = (body ?? {}) as { status?: User['riderStatus'] };
    setRider({ ...rider, riderStatus: status ?? rider.riderStatus });
    return wait({ rider } as T);
  }

  if (match('/rider/wallet/topup') && method === 'POST') {
    const { amount } = (body ?? {}) as { amount?: number };
    setRider({ ...rider, walletBalance: (rider.walletBalance ?? 0) + (amount ?? 0) });
    return wait({ rider } as T);
  }

  if (match('/rider/photo-upload') && method === 'POST') {
    return wait({
      uploadUrl: 'mock://upload',
      headers: {},
      expiresIn: 60,
      photoUrl: 'https://placehold.co/200x200',
    } as T);
  }

  if (match('/rider/orders/available') && method === 'GET') {
    // A suspended rider can't go online, so the pool stays hidden.
    return wait({ orders: rider.suspended ? [] : poolOrders } as T);
  }

  if (match('/rider/orders') && method === 'GET') {
    const scope = query?.scope;
    const orders = scope === 'active' ? riderOrders.filter((order) => order.status !== 'delivered' && order.status !== 'cancelled') : riderOrders;
    return wait({ orders } as T);
  }

  if (match('/rider/capacity-requests') && method === 'GET') {
    return wait({ requests: CAPACITY_REQUESTS } as T);
  }

  if (match('/rider/capacity-requests') && method === 'POST') {
    const { requestedLimit, reason } = (body ?? {}) as { requestedLimit: number; reason?: string };
    const request: CapacityRequest = {
      id: `capacity-${Date.now()}`,
      requestedLimit,
      reason,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    CAPACITY_REQUESTS.push(request);
    return wait({ request } as T);
  }

  if (match('/rider/earnings') && method === 'GET') {
    return wait({ totals: earningsTotals(), items: [] } as T);
  }

  if (match('/stations') && method === 'GET') {
    return wait({ stations: STATIONS } as T);
  }

  const acceptMatch = matchRoute('/rider/orders/:id/accept', path);
  if (acceptMatch && method === 'POST') {
    // Section 3.3: 3 unexcused cancellations in 7 days suspends the rider
    // until an admin resolves it - they cannot accept new orders meanwhile.
    if (rider.suspended) {
      throw new Error('Your account is suspended pending review. You cannot accept new orders until this is resolved.');
    }
    const index = poolOrders.findIndex((order) => order.id === acceptMatch.id);
    if (index === -1) throw notFound();
    const candidate = poolOrders[index];

    // Section 1.2, step 3: the platform fee is locked from the rider's
    // wallet the moment a cash order is accepted. Insufficient float blocks it.
    const isCash = candidate.paymentMethod === 'cash';
    const fee = candidate.pricing.serviceFee;
    const available = (rider.walletBalance ?? 0) - (rider.walletLocked ?? 0);
    if (isCash && available < fee) {
      throw new Error(
        `Your wallet balance is too low for this cash order. You need GH₵${(fee / 100).toFixed(2)} available, but have GH₵${(available / 100).toFixed(2)}. Top up your wallet to continue.`
      );
    }

    const [accepted] = poolOrders.splice(index, 1);
    const assigned: ApiOrder = {
      ...accepted,
      status: 'rider_assigned',
      customerId: { id: `customer-${accepted.id}`, firstName: 'New', lastName: 'Customer', phoneNumber: '+233500000000' },
      riderCommission: accepted.estimatedEarnings ?? Math.round(accepted.pricing.gasTotal * 0.3),
      updatedAt: new Date().toISOString(),
      platformFeeLocked: isCash,
    };
    riderOrders = [assigned, ...riderOrders];
    setRider({
      ...rider,
      activeOrderCount: rider.activeOrderCount + 1,
      walletLocked: isCash ? (rider.walletLocked ?? 0) + fee : rider.walletLocked,
    });
    return wait({ order: assigned } as T);
  }

  const declineMatch = matchRoute('/rider/orders/:id/decline', path);
  if (declineMatch && method === 'POST') {
    poolOrders = poolOrders.filter((order) => order.id !== declineMatch.id);
    return wait(undefined as T);
  }

  const statusMatch = matchRoute('/rider/orders/:id/status', path);
  if (statusMatch && method === 'PATCH') {
    const { status } = (body ?? {}) as { status?: ApiOrder['status'] };
    const index = riderOrders.findIndex((order) => order.id === statusMatch.id);
    if (index === -1) throw notFound();
    const order = riderOrders[index];
    // Section 1.2, step 6: the locked platform fee is deducted the moment
    // the rider marks a cash order delivered.
    const settleFeeLock = status === 'delivered' && order.platformFeeLocked;
    const updated: ApiOrder = {
      ...order,
      status: status ?? order.status,
      updatedAt: new Date().toISOString(),
      ...(status === 'delivered' ? { deliveredAt: new Date().toISOString() } : {}),
      ...(settleFeeLock ? { platformFeeLocked: false } : {}),
    };
    riderOrders[index] = updated;
    if (status === 'delivered' || status === 'cancelled') {
      const fee = order.pricing.serviceFee;
      setRider({
        ...rider,
        activeOrderCount: Math.max(0, rider.activeOrderCount - 1),
        ...(settleFeeLock
          ? {
              walletBalance: (rider.walletBalance ?? 0) - fee,
              walletLocked: Math.max(0, (rider.walletLocked ?? 0) - fee),
            }
          : {}),
      });
    }
    return wait({ order: updated } as T);
  }

  const cancelMatch = matchRoute('/rider/orders/:id/cancel', path);
  if (cancelMatch && method === 'POST') {
    const index = riderOrders.findIndex((order) => order.id === cancelMatch.id);
    if (index === -1) throw notFound();
    const order = riderOrders[index];
    // Section 2.1, step 8: a rider may only cancel before pickup.
    if (order.status !== 'rider_assigned') {
      throw new Error('This order has already been picked up and can no longer be cancelled here.');
    }

    const { reason } = (body ?? {}) as { reason?: CancelReason };
    const valid = !!reason && isValidCancelReason(reason);

    const updated: ApiOrder = {
      ...order,
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
      platformFeeLocked: false,
    };
    riderOrders[index] = updated;

    let nextRider: User = { ...rider, activeOrderCount: Math.max(0, rider.activeOrderCount - 1) };
    // Cancelling before pickup releases the lock - no deduction, unlike delivery.
    if (order.platformFeeLocked) {
      nextRider.walletLocked = Math.max(0, (nextRider.walletLocked ?? 0) - order.pricing.serviceFee);
    }
    if (!valid) {
      const cutoff = Date.now() - STRIKE_WINDOW_MS;
      const history = [...(rider.strikeHistory ?? []).filter((t) => new Date(t).getTime() > cutoff), new Date().toISOString()];
      nextRider = { ...nextRider, strikeHistory: history, strikes: history.length };
      if (history.length >= SUSPENSION_STRIKE_THRESHOLD) nextRider.suspended = true;
    }
    setRider(nextRider);
    return wait({ order: updated, rider: nextRider } as T);
  }

  const cashMatch = matchRoute('/rider/orders/:id/cash-collected', path);
  if (cashMatch && method === 'POST') {
    const index = riderOrders.findIndex((order) => order.id === cashMatch.id);
    if (index !== -1) riderOrders[index] = { ...riderOrders[index], cashCollected: true };
    return wait({ payment: { id: `payment-${cashMatch.id}`, orderId: cashMatch.id, method: 'cash', amount: riderOrders[index]?.pricing.total ?? 0, currency: 'GHS', status: 'cash_collected' } } as T);
  }

  const issuesMatch = matchRoute('/rider/orders/:id/issues', path);
  if (issuesMatch && method === 'GET') {
    return wait({ issues: [] } as T);
  }
  if (issuesMatch && method === 'POST') {
    const { reasons, description } = (body ?? {}) as { reasons: string[]; description?: string };
    return wait({
      issue: {
        id: `issue-${issuesMatch.id}`,
        orderId: issuesMatch.id,
        riderId: rider.id,
        reasons,
        description,
        status: 'open',
        createdAt: new Date().toISOString(),
      },
    } as T);
  }

  if (match('/routing') && method === 'GET') {
    return wait({
      route: {
        distanceKm: 3,
        durationSeconds: 600,
        geometry: { type: 'LineString', coordinates: [] },
      },
    } as T);
  }

  if (match('/rider/location') && method === 'PATCH') {
    return wait(undefined as T);
  }

  if (match('/me/push-token')) {
    return wait(undefined as T);
  }

  console.warn(`[devMock] Unhandled mock request: ${method} ${path}`);
  return wait(undefined as T);
}

function notFound() {
  return new Error('[devMock] order not found');
}
