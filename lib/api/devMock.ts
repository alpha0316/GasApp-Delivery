import * as SecureStore from 'expo-secure-store';
import { isValidCancelReason, type CancelReason } from '../orders/cancelReasons';
import { STRIKE_WINDOW_MS, SUSPENSION_STRIKE_THRESHOLD } from '../orders/strikes';
import { deliveryFeeForDistanceKm, PLATFORM_FEE_BY_SIZE } from '../pricing/feeSchedule';
import { mockRoadPath } from '../sim/mockRoute';
import type {
  Area,
  ApiCylinder,
  ApiOrder,
  CapacityRequest,
  CustomerContact,
  CylinderSize,
  EarningsTotals,
  IssueReason,
  OrderIssueReport,
  OrderStatus,
  PaymentMethod,
  Station,
  User,
  VehicleType,
} from './types';

// TEMP: flip to false to hit the real backend again. While true, every
// request made through lib/api/client.ts's api() is answered locally so the
// onboarding flow (phone -> otp -> name -> photo -> vehicle -> home) and the
// home screen can be clicked through with no server running.
export const MOCK_API = true;

const MOCK_DELAY_MS = 300;

// Which canned test scenario seeds the mock rider/orders below. Flip this
// (and reload) to jump straight into that scenario, already onboarded and
// approved - no need to click through phone/otp/name/photo/vehicle first.
// features/auth/store.ts's AUTH=false bypass reads the same scenario, so the
// two dev shortcuts always show the same thing.
export type MockScenario =
  // Motorbike / bicycle: single-order rider.
  | 'motorbike_incoming' // online, no active order, exactly 1 new pool order
  | 'motorbike_active' // 1 active order mid-delivery (heading to station), no new orders
  | 'motorbike_active_incoming' // active order + a new pool order interrupting it
  // Tricycle / car / truck: batch rider.
  | 'tricycle_queue' // no active batch yet, 2 pool orders sitting in the zone
  | 'tricycle_batch_delivering' // batch filled at the station: 3 cylinders to drop off
  | 'car_queue' // no active batch yet, 3 pool orders sitting in the zone
  | 'car_batch_full' // capacity maxed out: 4/4 active, mostly still to collect
  | 'truck_queue' // no active batch yet, 5 pool orders sitting in the zone
  | 'truck_batch_collecting' // mid-collection: 2 cylinders collected, 2 still to pick up
  | 'truck_multi_station' // edge case: 5 orders whose customers picked 3 different stations (2 + 2 + 1)
  // Edge cases.
  | 'edge_suspended' // 3 strikes in 7 days: suspended, pool hidden
  | 'edge_near_suspension' // 2 strikes in the last day: reduced priority, not yet suspended
  | 'edge_low_wallet' // wallet balance too low to cover a cash order's platform fee
  | 'edge_flagged_single' // active single order with an open issue report (shows the banner)
  | 'edge_empty'; // fully onboarded, nothing anywhere: no pool, no active, no history

export const MOCK_SCENARIO: MockScenario = 'motorbike_incoming';

// Mirrors features/pool/vehicleMode.ts's single-vs-batch split: a
// motorbike/bicycle rider works one order at a time, a tricycle, car or
// truck rider works a batch queue of several.
const MAX_CONCURRENT_ORDERS: Record<VehicleType, number> = {
  motorbike: 1,
  bicycle: 1,
  tricycle: 3,
  car: 4,
  truck: 6,
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
  {
    id: 'station-osu',
    name: 'Shell - Osu',
    location: { type: 'Point', coordinates: [-0.1769, 5.5558] },
    areaId: 'area-accra',
    isActive: true,
  },
];

const isoMinutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

function makePricing(gasTotal: number, distanceFee: number, serviceFee: number, tip: number) {
  return { gasAmount: gasTotal, gasTotal, distanceFee, serviceFee, tip, total: gasTotal + distanceFee + serviceFee + tip, currency: 'GHS' };
}

const GAS_PRICE_BY_SIZE: Record<CylinderSize, number> = { small: 3000, medium: 4500, large: 6000 };

function contact(id: string, firstName: string, lastName: string, phoneNumber: string): CustomerContact {
  return { id, firstName, lastName, phoneNumber };
}

const MOCK_CUSTOMERS: [string, string][] = [
  ['Akua', 'Danso'],
  ['Kwesi', 'Appiah'],
  ['Efia', 'Owusu'],
  ['Nii', 'Lartey'],
  ['Adjoa', 'Boateng'],
  ['Fiifi', 'Arthur'],
  ['Maame', 'Asare'],
  ['Selorm', 'Agbeko'],
  ['Yaa', 'Asantewaa'],
  ['Kojo', 'Mensah'],
  ['Abla', 'Dzifa'],
  ['Kwaku', 'Ofori'],
];

// A made-up customer for a pool order once it's accepted, so each pin on the
// map has its own name instead of "New Customer". Skips names already on the
// rider's active orders, so two pins never share a name.
function mockCustomerFor(orderId: string): CustomerContact {
  let hash = 0;
  for (const char of orderId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const inUse = new Set(
    riderOrders
      .filter((o) => o.status !== 'delivered' && o.status !== 'cancelled' && typeof o.customerId !== 'string')
      .map((o) => (typeof o.customerId === 'string' ? '' : `${o.customerId.firstName} ${o.customerId.lastName}`))
  );
  const start = hash % MOCK_CUSTOMERS.length;
  const pick =
    Array.from({ length: MOCK_CUSTOMERS.length }, (_, i) => MOCK_CUSTOMERS[(start + i) % MOCK_CUSTOMERS.length]).find(
      ([first, last]) => !inUse.has(`${first} ${last}`)
    ) ?? MOCK_CUSTOMERS[start];
  const [firstName, lastName] = pick;
  const phone = `+23324${String(1000000 + (hash % 9000000)).slice(0, 7)}`;
  return contact(`customer-${orderId}`, firstName, lastName, phone);
}

// A fully onboarded, approved rider of the given vehicle type, ready to land
// straight on the home screen without going through onboarding.
function onboardedRider(overrides: Partial<User> & { vehicleType: VehicleType }): User {
  return {
    id: 'dev-rider',
    role: 'rider',
    phoneNumber: '+233500000000',
    firstName: 'Dev',
    lastName: 'Rider',
    isApproved: true,
    riderStatus: 'available',
    plateNumber: 'GR-0000-24',
    photoUrl: 'https://placehold.co/200x200',
    areaId: 'area-accra',
    cylinderCapacity: 6,
    activeOrderCount: 0,
    rating: 4.8,
    walletBalance: 10000,
    walletLocked: 0,
    ...overrides,
    maxConcurrentOrders: overrides.maxConcurrentOrders ?? MAX_CONCURRENT_ORDERS[overrides.vehicleType],
  };
}

interface OrderSeed {
  id: string;
  status: OrderStatus;
  // A plain id means "still in the pool" (no contact info yet, per the real
  // API). A CustomerContact means "already accepted" (riderCommission set).
  customer: string | CustomerContact;
  cylinderSize: CylinderSize;
  cylinderCount?: number;
  // Mixed sizes/amounts in one order. Overrides cylinderSize/cylinderCount,
  // and the gas total becomes the sum of the fill amounts.
  cylinders?: ApiCylinder[];
  isFullFill?: boolean;
  deliveryAddress: { label: string; lat: number; lng: number };
  riderInstructions?: string;
  stationId: string;
  distanceKm: number;
  paymentMethod: PaymentMethod;
  tip?: number;
  createdMinutesAgo: number;
  updatedMinutesAgo?: number;
  deliveredMinutesAgo?: number;
  cashCollected?: boolean;
  platformFeeLocked?: boolean;
  pickupDistanceKm?: number;
}

function buildOrder(seed: OrderSeed): ApiOrder {
  const accepted = typeof seed.customer !== 'string';
  const gasTotal = seed.cylinders
    ? seed.cylinders.reduce((sum, c) => sum + c.fillAmount, 0)
    : GAS_PRICE_BY_SIZE[seed.cylinderSize] * (seed.cylinderCount ?? 1);
  const pricing = makePricing(
    gasTotal,
    deliveryFeeForDistanceKm(seed.distanceKm),
    PLATFORM_FEE_BY_SIZE[seed.cylinderSize],
    seed.tip ?? 0
  );
  // The rider's commission is the delivery fee (product doc section 1.3); a tip
  // is on top. riderCommission excludes the tip, estimatedEarnings includes it
  // (see features/orders/mappers.ts's earnings).
  const commission = pricing.distanceFee;
  return {
    id: seed.id,
    customerId: seed.customer,
    cylinderSize: seed.cylinders?.[0]?.size ?? seed.cylinderSize,
    cylinderCount: seed.cylinders?.length ?? seed.cylinderCount ?? 1,
    ...(seed.cylinders ? { cylinders: seed.cylinders } : {}),
    isFullFill: seed.isFullFill ?? true,
    deliveryAddress: seed.deliveryAddress,
    riderInstructions: seed.riderInstructions ?? '',
    stationId: seed.stationId,
    distanceKm: seed.distanceKm,
    pricing,
    paymentMethod: seed.paymentMethod,
    status: seed.status,
    createdAt: isoMinutesAgo(seed.createdMinutesAgo),
    updatedAt: isoMinutesAgo(seed.updatedMinutesAgo ?? seed.createdMinutesAgo),
    ...(seed.deliveredMinutesAgo !== undefined ? { deliveredAt: isoMinutesAgo(seed.deliveredMinutesAgo) } : {}),
    ...(accepted
      ? { riderCommission: commission, cashCollected: seed.cashCollected, platformFeeLocked: seed.platformFeeLocked }
      : { estimatedEarnings: commission + pricing.tip, pickupDistanceKm: seed.pickupDistanceKm ?? seed.distanceKm * 0.4 }),
  };
}

interface ScenarioData {
  rider: User;
  // Where the simulated rider is parked when the scenario starts (mock mode
  // has no real GPS - see features/location/simulator.ts).
  riderStart?: { lat: number; lng: number };
  pool: ApiOrder[];
  orders: ApiOrder[];
  issues?: Record<string, OrderIssueReport[]>;
}

const SCENARIOS: Record<MockScenario, () => ScenarioData> = {
  motorbike_incoming: () => ({
    rider: onboardedRider({ vehicleType: 'motorbike' }),
    riderStart: { lat: 5.6352, lng: -0.1702 },
    pool: [
      buildOrder({
        id: 'order-pool-1',
        status: 'awaiting_rider',
        customer: 'customer-pool-1',
        cylinderSize: 'medium',
        cylinders: [{ size: 'small', fillAmount: 3000 }, { size: 'small', fillAmount: 5000 }],
        deliveryAddress: { label: 'East Legon, Accra', lat: 5.6494, lng: -0.1538 },
        riderInstructions: 'Call when you arrive at the gate.',
        stationId: 'station-spintex',
        distanceKm: 4.1,
        paymentMethod: 'paystack',
        tip: 500,
        createdMinutesAgo: 2,
      }),
    ],
    orders: [
      buildOrder({
        id: 'order-done-1',
        status: 'delivered',
        customer: contact('customer-done-1', 'Ama', 'Boateng', '+233557654321'),
        cylinderSize: 'medium',
        deliveryAddress: { label: 'Osu, Accra', lat: 5.5558, lng: -0.1821 },
        stationId: 'station-labadi',
        distanceKm: 2.1,
        paymentMethod: 'paystack',
        tip: 1000,
        createdMinutesAgo: 240,
        updatedMinutesAgo: 190,
        deliveredMinutesAgo: 190,
      }),
      buildOrder({
        id: 'order-done-2',
        status: 'cancelled',
        customer: contact('customer-done-2', 'Yaw', 'Mensah', '+233244112233'),
        cylinderSize: 'small',
        deliveryAddress: { label: 'Adenta, Accra', lat: 5.7085, lng: -0.1016 },
        stationId: 'station-spintex',
        distanceKm: 6.7,
        paymentMethod: 'cash',
        createdMinutesAgo: 1500,
        updatedMinutesAgo: 1480,
      }),
    ],
  }),

  motorbike_active: () => ({
    rider: onboardedRider({ vehicleType: 'motorbike', activeOrderCount: 1, walletLocked: 1200 }),
    // Just collected the empty cylinder from the customer.
    riderStart: { lat: 5.6062, lng: -0.1705 },
    pool: [],
    orders: [
      buildOrder({
        id: 'order-active-1',
        status: 'picked_up',
        customer: contact('customer-active-1', 'Kwabena', 'Owusu', '+233501234567'),
        cylinderSize: 'large',
        deliveryAddress: { label: 'Airport Residential, Accra', lat: 5.605, lng: -0.1719 },
        riderInstructions: 'Blue gate, ring the bell twice.',
        stationId: 'station-spintex',
        distanceKm: 3.4,
        paymentMethod: 'cash',
        tip: 800,
        createdMinutesAgo: 18,
        updatedMinutesAgo: 6,
        platformFeeLocked: true,
      }),
      buildOrder({
        id: 'order-done-1',
        status: 'delivered',
        customer: contact('customer-done-1', 'Ama', 'Boateng', '+233557654321'),
        cylinderSize: 'medium',
        deliveryAddress: { label: 'Osu, Accra', lat: 5.5558, lng: -0.1821 },
        stationId: 'station-labadi',
        distanceKm: 2.1,
        paymentMethod: 'paystack',
        tip: 1000,
        createdMinutesAgo: 240,
        updatedMinutesAgo: 190,
        deliveredMinutesAgo: 190,
      }),
    ],
  }),

  motorbike_active_incoming: () => ({
    rider: onboardedRider({ vehicleType: 'motorbike', activeOrderCount: 1 }),
    // Just left the filling station with the full cylinder.
    riderStart: { lat: 5.5655, lng: -0.1612 },
    pool: [
      buildOrder({
        id: 'order-pool-interrupt',
        status: 'awaiting_rider',
        customer: 'customer-pool-interrupt',
        cylinderSize: 'small',
        deliveryAddress: { label: 'Airport Hills, Accra', lat: 5.6128, lng: -0.1846 },
        stationId: 'station-osu',
        distanceKm: 2.6,
        paymentMethod: 'cash',
        createdMinutesAgo: 0,
      }),
    ],
    orders: [
      buildOrder({
        id: 'order-active-dropoff',
        status: 'en_route_to_customer',
        customer: contact('customer-active-dropoff', 'Essandoh', 'Takyi', '+233244009988'),
        cylinderSize: 'small',
        deliveryAddress: { label: 'Dzorwulu, Accra', lat: 5.5901, lng: -0.1931 },
        stationId: 'station-labadi',
        distanceKm: 2.8,
        paymentMethod: 'paystack',
        createdMinutesAgo: 25,
        updatedMinutesAgo: 3,
      }),
    ],
  }),

  tricycle_queue: () => ({
    rider: onboardedRider({ vehicleType: 'tricycle' }),
    riderStart: { lat: 5.6205, lng: -0.1752 },
    pool: [
      buildOrder({
        id: 'order-pool-1',
        status: 'awaiting_rider',
        customer: 'customer-pool-1',
        cylinderSize: 'medium',
        deliveryAddress: { label: 'East Legon, Accra', lat: 5.6494, lng: -0.1538 },
        stationId: 'station-spintex',
        distanceKm: 4.1,
        paymentMethod: 'paystack',
        tip: 500,
        createdMinutesAgo: 3,
      }),
      buildOrder({
        id: 'order-pool-2',
        status: 'awaiting_rider',
        customer: 'customer-pool-2',
        cylinderSize: 'small',
        cylinders: [{ size: 'small', fillAmount: 3000 }, { size: 'small', fillAmount: 5000 }, { size: 'medium', fillAmount: 7000 }],
        cylinderCount: 2,
        isFullFill: false,
        deliveryAddress: { label: 'Dzorwulu, Accra', lat: 5.5901, lng: -0.1931 },
        riderInstructions: 'Leave with the security man if no answer.',
        stationId: 'station-labadi',
        distanceKm: 2.8,
        paymentMethod: 'cash',
        createdMinutesAgo: 8,
      }),
    ],
    orders: [],
  }),

  tricycle_batch_delivering: () => ({
    rider: onboardedRider({ vehicleType: 'tricycle', activeOrderCount: 3, walletLocked: 1800 }),
    // Every cylinder is collected and filled; just left the station.
    riderStart: { lat: 5.5572, lng: -0.1752 },
    pool: [],
    orders: [
      buildOrder({
        id: 'order-batch-1',
        status: 'en_route_to_customer',
        customer: contact('customer-batch-1', 'Francis', 'Sam', '+233554144611'),
        cylinderSize: 'small',
        deliveryAddress: { label: 'Labone, Accra', lat: 5.5665, lng: -0.172 },
        stationId: 'station-osu',
        distanceKm: 3.0,
        paymentMethod: 'cash',
        tip: 1000,
        createdMinutesAgo: 40,
        updatedMinutesAgo: 4,
        platformFeeLocked: true,
      }),
      buildOrder({
        id: 'order-batch-2',
        status: 'en_route_to_customer',
        customer: contact('customer-batch-2', 'Abena', 'Osei', '+233552301174'),
        cylinderSize: 'medium',
        cylinders: [{ size: 'medium', fillAmount: 4500 }, { size: 'medium', fillAmount: 7000 }, { size: 'small', fillAmount: 2500 }],
        deliveryAddress: { label: 'Cantonments, Accra', lat: 5.5784, lng: -0.1748 },
        stationId: 'station-osu',
        distanceKm: 5.2,
        paymentMethod: 'paystack',
        tip: 1200,
        createdMinutesAgo: 35,
        updatedMinutesAgo: 4,
      }),
      buildOrder({
        id: 'order-batch-3',
        status: 'en_route_to_customer',
        customer: contact('customer-batch-3', 'Kofi', 'Agyemang', '+233208794401'),
        cylinderSize: 'large',
        deliveryAddress: { label: 'Ridge, Accra', lat: 5.5636, lng: -0.1968 },
        stationId: 'station-osu',
        distanceKm: 5.8,
        paymentMethod: 'cash',
        createdMinutesAgo: 20,
        updatedMinutesAgo: 4,
        platformFeeLocked: true,
      }),
    ],
  }),

  car_queue: () => ({
    rider: onboardedRider({ vehicleType: 'car' }),
    riderStart: { lat: 5.6015, lng: -0.1598 },
    pool: [
      buildOrder({
        id: 'order-pool-car-1',
        status: 'awaiting_rider',
        customer: 'customer-pool-car-1',
        cylinderSize: 'large',
        deliveryAddress: { label: 'Airport Residential, Accra', lat: 5.605, lng: -0.1719 },
        stationId: 'station-spintex',
        distanceKm: 3.4,
        paymentMethod: 'paystack',
        tip: 700,
        createdMinutesAgo: 2,
      }),
      buildOrder({
        id: 'order-pool-car-2',
        status: 'awaiting_rider',
        customer: 'customer-pool-car-2',
        cylinderSize: 'medium',
        cylinders: [{ size: 'medium', fillAmount: 4500 }, { size: 'small', fillAmount: 3000 }],
        cylinderCount: 2,
        deliveryAddress: { label: 'Shiashie, Accra', lat: 5.6205, lng: -0.1622 },
        riderInstructions: 'Yellow house behind the pharmacy.',
        stationId: 'station-spintex',
        distanceKm: 2.1,
        paymentMethod: 'cash',
        createdMinutesAgo: 5,
      }),
      buildOrder({
        id: 'order-pool-car-3',
        status: 'awaiting_rider',
        customer: 'customer-pool-car-3',
        cylinderSize: 'small',
        deliveryAddress: { label: 'Baatsona, Accra', lat: 5.6312, lng: -0.1405 },
        stationId: 'station-spintex',
        distanceKm: 1.6,
        paymentMethod: 'paystack',
        createdMinutesAgo: 9,
      }),
    ],
    orders: [],
  }),

  car_batch_full: () => ({
    rider: onboardedRider({ vehicleType: 'car', activeOrderCount: 4, walletLocked: 2400 }),
    riderStart: { lat: 5.6152, lng: -0.1318 },
    pool: [],
    orders: [
      buildOrder({
        id: 'order-full-1',
        status: 'rider_assigned',
        customer: contact('customer-full-1', 'Nana', 'Yeboah', '+233203334455'),
        cylinderSize: 'large',
        deliveryAddress: { label: 'Trasacco Valley, Accra', lat: 5.6281, lng: -0.1397 },
        stationId: 'station-spintex',
        distanceKm: 3.9,
        paymentMethod: 'cash',
        createdMinutesAgo: 12,
        platformFeeLocked: true,
      }),
      buildOrder({
        id: 'order-full-2',
        status: 'rider_assigned',
        customer: contact('customer-full-2', 'Linda', 'Appiah', '+233275551122'),
        cylinderSize: 'medium',
        deliveryAddress: { label: 'Spintex Rd, Accra', lat: 5.6394, lng: -0.1221 },
        stationId: 'station-spintex',
        distanceKm: 1.2,
        paymentMethod: 'paystack',
        createdMinutesAgo: 9,
      }),
      buildOrder({
        id: 'order-full-3',
        status: 'picked_up',
        customer: contact('customer-full-3', 'Kwame', 'Darko', '+233244887766'),
        cylinderSize: 'small',
        deliveryAddress: { label: 'Teshie, Accra', lat: 5.5811, lng: -0.1012 },
        stationId: 'station-labadi',
        distanceKm: 4.6,
        paymentMethod: 'cash',
        createdMinutesAgo: 22,
        updatedMinutesAgo: 5,
        platformFeeLocked: true,
      }),
      buildOrder({
        id: 'order-full-4',
        status: 'rider_assigned',
        customer: contact('customer-full-4', 'Efua', 'Asante', '+233501119988'),
        cylinderSize: 'large',
        cylinders: [{ size: 'large', fillAmount: 6000 }, { size: 'medium', fillAmount: 4500 }],
        cylinderCount: 2,
        isFullFill: false,
        deliveryAddress: { label: 'Cantonments, Accra', lat: 5.5724, lng: -0.1667 },
        stationId: 'station-osu',
        distanceKm: 2.3,
        paymentMethod: 'paystack',
        createdMinutesAgo: 6,
      }),
    ],
  }),

  truck_queue: () => ({
    rider: onboardedRider({ vehicleType: 'truck', cylinderCapacity: 20 }),
    riderStart: { lat: 5.6268, lng: -0.1102 },
    pool: [
      ['order-pool-truck-1', 'Sakumono, Tema', 5.6232, -0.0842, 'large', 3, 'cash'],
      ['order-pool-truck-2', 'Community 18, Spintex', 5.6402, -0.1085, 'medium', 2, 'paystack'],
      ['order-pool-truck-3', 'Lashibi, Accra', 5.6338, -0.0964, 'small', 4, 'paystack'],
      ['order-pool-truck-4', 'Nungua, Accra', 5.6012, -0.0786, 'large', 2, 'cash'],
      ['order-pool-truck-5', 'Batsonaa, Spintex', 5.6326, -0.1362, 'medium', 1, 'paystack'],
    ].map(([id, label, lat, lng, size, count, payment], index) =>
      buildOrder({
        id: id as string,
        status: 'awaiting_rider',
        customer: `customer-${id}`,
        cylinderSize: size as CylinderSize,
        cylinderCount: count as number,
        deliveryAddress: { label: label as string, lat: lat as number, lng: lng as number },
        stationId: 'station-spintex',
        distanceKm: 2 + index * 0.8,
        paymentMethod: payment as PaymentMethod,
        tip: index % 2 === 0 ? 500 : 0,
        createdMinutesAgo: 2 + index * 3,
      })
    ),
    orders: [],
  }),

  truck_batch_collecting: () => ({
    rider: onboardedRider({ vehicleType: 'truck', activeOrderCount: 4, walletLocked: 2400, cylinderCapacity: 20 }),
    // Parked at the second customer, who just handed over their cylinders.
    riderStart: { lat: 5.6402, lng: -0.1085 },
    pool: [],
    orders: [
      buildOrder({
        id: 'order-truck-1',
        status: 'picked_up',
        customer: contact('customer-truck-1', 'Esi', 'Quaye', '+233245550101'),
        cylinderSize: 'large',
        cylinderCount: 3,
        deliveryAddress: { label: 'Sakumono, Tema', lat: 5.6232, lng: -0.0842 },
        stationId: 'station-spintex',
        distanceKm: 6.1,
        paymentMethod: 'cash',
        createdMinutesAgo: 30,
        updatedMinutesAgo: 12,
        platformFeeLocked: true,
      }),
      buildOrder({
        id: 'order-truck-2',
        status: 'picked_up',
        customer: contact('customer-truck-2', 'Kojo', 'Antwi', '+233205550202'),
        cylinderSize: 'medium',
        cylinderCount: 2,
        deliveryAddress: { label: 'Community 18, Spintex', lat: 5.6402, lng: -0.1085 },
        stationId: 'station-spintex',
        distanceKm: 3.2,
        paymentMethod: 'paystack',
        tip: 500,
        createdMinutesAgo: 28,
        updatedMinutesAgo: 1,
      }),
      buildOrder({
        id: 'order-truck-3',
        status: 'rider_assigned',
        customer: contact('customer-truck-3', 'Adwoa', 'Mensah', '+233275550303'),
        cylinderSize: 'small',
        cylinders: [{ size: 'small', fillAmount: 3000 }, { size: 'small', fillAmount: 3000 }, { size: 'small', fillAmount: 2000 }, { size: 'small', fillAmount: 5000 }],
        cylinderCount: 4,
        deliveryAddress: { label: 'Lashibi, Accra', lat: 5.6338, lng: -0.0964 },
        stationId: 'station-spintex',
        distanceKm: 4.4,
        paymentMethod: 'paystack',
        createdMinutesAgo: 25,
      }),
      buildOrder({
        id: 'order-truck-4',
        status: 'rider_assigned',
        customer: contact('customer-truck-4', 'Yaw', 'Boadu', '+233545550404'),
        cylinderSize: 'large',
        cylinderCount: 2,
        deliveryAddress: { label: 'Nungua, Accra', lat: 5.6012, lng: -0.0786 },
        stationId: 'station-spintex',
        distanceKm: 7.0,
        paymentMethod: 'cash',
        createdMinutesAgo: 22,
        platformFeeLocked: true,
      }),
    ],
  }),

  // Edge case: customers chose their own stations (e.g. the one nearest them),
  // so one batch fills at three. Batch order puts the stations in visiting
  // order Spintex -> Labadi -> Osu.
  truck_multi_station: () => ({
    rider: onboardedRider({ vehicleType: 'truck', activeOrderCount: 5, walletLocked: 1700, cylinderCapacity: 20 }),
    riderStart: { lat: 5.6152, lng: -0.1318 },
    pool: [],
    orders: (
      [
        ['order-ms-1', 'Kofi', 'Badu', 'Baatsona, Accra', 5.6312, -0.1405, 'station-spintex', 'medium', 'cash'],
        ['order-ms-2', 'Akosua', 'Nyarko', 'La, Accra', 5.565, -0.148, 'station-labadi', 'small', 'paystack'],
        ['order-ms-3', 'Yaw', 'Addo', 'Community 6, Tema Rd', 5.626, -0.132, 'station-spintex', 'large', 'paystack'],
        ['order-ms-4', 'Esi', 'Ansah', 'Osu, Accra', 5.56, -0.183, 'station-osu', 'medium', 'cash'],
        ['order-ms-5', 'Kwabena', 'Tetteh', 'Teshie, Accra', 5.5811, -0.1312, 'station-labadi', 'small', 'paystack'],
      ] as const
    ).map(([id, first, last, label, lat, lng, stationId, size, payment], index) =>
      buildOrder({
        id,
        status: 'rider_assigned',
        customer: contact(`customer-${id}`, first, last, `+23324${5550500 + index}`),
        cylinderSize: size,
        ...(index === 2 ? { cylinders: [{ size: 'large' as const, fillAmount: 6000 }, { size: 'small' as const, fillAmount: 3000 }] } : {}),
        deliveryAddress: { label, lat, lng },
        stationId,
        distanceKm: 2.5 + index * 0.6,
        paymentMethod: payment,
        tip: index % 2 === 0 ? 500 : 0,
        createdMinutesAgo: 18 - index * 3,
        platformFeeLocked: payment === 'cash',
      })
    ),
  }),

  edge_suspended: () => {
    const strikeHistory = [isoMinutesAgo(60 * 24 * 5), isoMinutesAgo(60 * 24 * 2), isoMinutesAgo(60 * 6)];
    return {
      rider: onboardedRider({
        vehicleType: 'motorbike',
        suspended: true,
        strikes: strikeHistory.length,
        strikeHistory,
      }),
      riderStart: { lat: 5.5952, lng: -0.1848 },
      pool: [
        buildOrder({
          id: 'order-pool-1',
          status: 'awaiting_rider',
          customer: 'customer-pool-1',
          cylinderSize: 'medium',
          deliveryAddress: { label: 'East Legon, Accra', lat: 5.6494, lng: -0.1538 },
          stationId: 'station-spintex',
          distanceKm: 4.1,
          paymentMethod: 'paystack',
          createdMinutesAgo: 2,
        }),
      ],
      orders: [
        buildOrder({
          id: 'order-done-cancelled-1',
          status: 'cancelled',
          customer: contact('customer-done-cancelled-1', 'Yaw', 'Mensah', '+233244112233'),
          cylinderSize: 'small',
          deliveryAddress: { label: 'Adenta, Accra', lat: 5.7085, lng: -0.1016 },
          stationId: 'station-spintex',
          distanceKm: 6.7,
          paymentMethod: 'cash',
          createdMinutesAgo: 60 * 6 + 10,
          updatedMinutesAgo: 60 * 6,
        }),
      ],
    };
  },

  edge_near_suspension: () => {
    const strikeHistory = [isoMinutesAgo(60 * 20), isoMinutesAgo(60 * 4)];
    return {
      rider: onboardedRider({
        vehicleType: 'motorbike',
        strikes: strikeHistory.length,
        strikeHistory,
      }),
      riderStart: { lat: 5.5952, lng: -0.1848 },
      pool: [
        buildOrder({
          id: 'order-pool-1',
          status: 'awaiting_rider',
          customer: 'customer-pool-1',
          cylinderSize: 'medium',
          deliveryAddress: { label: 'East Legon, Accra', lat: 5.6494, lng: -0.1538 },
          stationId: 'station-spintex',
          distanceKm: 4.1,
          paymentMethod: 'paystack',
          createdMinutesAgo: 2,
        }),
      ],
      orders: [
        buildOrder({
          id: 'order-active-1',
          status: 'rider_assigned',
          customer: contact('customer-active-1', 'Kwabena', 'Owusu', '+233501234567'),
          cylinderSize: 'large',
          deliveryAddress: { label: 'Airport Residential, Accra', lat: 5.605, lng: -0.1719 },
          stationId: 'station-spintex',
          distanceKm: 3.4,
          paymentMethod: 'cash',
          createdMinutesAgo: 8,
          platformFeeLocked: true,
        }),
      ],
    };
  },

  edge_low_wallet: () => ({
    // Platform fee for a large cash order (see PLATFORM_FEE_BY_SIZE) is well
    // above this balance, so accepting it must fail with the top-up error.
    rider: onboardedRider({ vehicleType: 'motorbike', walletBalance: 200, walletLocked: 0 }),
    pool: [
      buildOrder({
        id: 'order-pool-cash-large',
        status: 'awaiting_rider',
        customer: 'customer-pool-cash-large',
        cylinderSize: 'large',
        deliveryAddress: { label: 'Trasacco Valley, Accra', lat: 5.6281, lng: -0.1397 },
        stationId: 'station-spintex',
        distanceKm: 3.9,
        paymentMethod: 'cash',
        createdMinutesAgo: 1,
      }),
      buildOrder({
        id: 'order-pool-card-small',
        status: 'awaiting_rider',
        customer: 'customer-pool-card-small',
        cylinderSize: 'small',
        deliveryAddress: { label: 'Dzorwulu, Accra', lat: 5.5901, lng: -0.1931 },
        stationId: 'station-labadi',
        distanceKm: 2.8,
        paymentMethod: 'paystack',
        createdMinutesAgo: 4,
      }),
    ],
    orders: [],
  }),

  edge_flagged_single: () => ({
    rider: onboardedRider({ vehicleType: 'motorbike', activeOrderCount: 1 }),
    riderStart: { lat: 5.5572, lng: -0.1752 },
    pool: [],
    orders: [
      buildOrder({
        id: 'order-flagged-1',
        status: 'en_route_to_customer',
        customer: contact('customer-flagged-1', 'Akosua', 'Frimpong', '+233269991122'),
        cylinderSize: 'medium',
        deliveryAddress: { label: 'Labone, Accra', lat: 5.5665, lng: -0.172 },
        stationId: 'station-osu',
        distanceKm: 2.2,
        paymentMethod: 'paystack',
        createdMinutesAgo: 30,
        updatedMinutesAgo: 8,
      }),
    ],
    issues: {
      'order-flagged-1': [
        {
          id: 'issue-order-flagged-1',
          orderId: 'order-flagged-1',
          riderId: 'dev-rider',
          reasons: ['wrong_pickup'],
          description: 'Customer gave the wrong gate number; support is helping reroute.',
          status: 'open',
          createdAt: isoMinutesAgo(8),
        },
      ],
    },
  }),

  edge_empty: () => ({
    rider: onboardedRider({ vehicleType: 'motorbike' }),
    pool: [],
    orders: [],
  }),
};

function seedScenario(scenario: MockScenario): ScenarioData {
  return SCENARIOS[scenario]();
}

// Central Accra, for scenarios that don't pick their own start point.
const DEFAULT_RIDER_START = { lat: 5.6098, lng: -0.1702 };

// Kept separate from the scenarios above: a blank, un-onboarded rider, used
// only to mirror the real sign-out boundary (see mockResetRider below).
const BLANK_RIDER: User = {
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
  walletLocked: 0,
};

// Display labels for the floating dev scenario switcher (components/dev/
// ScenarioSwitcher.tsx), grouped the same way MockScenario's comment groups them.
export const MOCK_SCENARIO_LABELS: Record<MockScenario, string> = {
  motorbike_incoming: '🏍️ Motorbike · 1 incoming order',
  motorbike_active: '🏍️ Motorbike · active delivery',
  motorbike_active_incoming: '🏍️ Motorbike · active + incoming',
  tricycle_queue: '🛺 Tricycle · orders queued',
  tricycle_batch_delivering: '🛺 Tricycle · batch delivering',
  car_queue: '🚗 Car · orders queued',
  car_batch_full: '🚗 Car · batch full (4/4)',
  truck_queue: '🚚 Truck · orders queued',
  truck_batch_collecting: '🚚 Truck · collecting cylinders',
  truck_multi_station: '🚚 Truck · 5 orders, 3 stations',
  edge_suspended: '⚠️ Edge · suspended',
  edge_near_suspension: '⚠️ Edge · near suspension',
  edge_low_wallet: '⚠️ Edge · wallet too low',
  edge_flagged_single: '⚠️ Edge · flagged order',
  edge_empty: '⚠️ Edge · empty state',
};

export const MOCK_SCENARIOS = Object.keys(SCENARIOS) as MockScenario[];

const seed = seedScenario(MOCK_SCENARIO);

// A static snapshot of the scenario's rider, for features/auth/store.ts's
// AUTH=false bypass to land on the exact same scenario with zero clicks.
export const MOCK_SCENARIO_RIDER: User = seed.rider;

// Tracks whichever scenario is live right now - the MOCK_SCENARIO constant
// above only picks the one seeded at boot. mockSwitchScenario (called from
// the floating dev switcher) reseeds everything below and moves this.
let activeScenario: MockScenario = MOCK_SCENARIO;

let rider: User = seed.rider;
let poolOrders: ApiOrder[] = seed.pool;
let riderOrders: ApiOrder[] = seed.orders;
let orderIssues: Record<string, OrderIssueReport[]> = seed.issues ?? {};
let riderStart = seed.riderStart ?? DEFAULT_RIDER_START;
// Orders this rider referred back to the pool: other riders see them again,
// but they're never offered back to the rider who passed them on.
let referredAway = new Set<string>();

// The sign-in token survives JS reloads (it's in SecureStore), but this
// module's in-memory rider does not. Without persisting it too, a reload
// mid-onboarding keeps the token but resets the rider to blank, which
// nextRoute reads as "needs a name" again, sending the rider backward even
// though they're still signed in - a loop that never reaches home. The
// scenario tag alongside it means flipping MOCK_SCENARIO and reloading
// always lands on the freshly seeded scenario instead of a stale one from a
// previous run.
const MOCK_RIDER_KEY = 'dev-mock-rider';
const MOCK_SCENARIO_KEY = 'dev-mock-scenario';

let hydrated = false;
const ready: Promise<void> = (async () => {
  try {
    const storedScenario = await SecureStore.getItemAsync(MOCK_SCENARIO_KEY);
    if (storedScenario === MOCK_SCENARIO) {
      const stored = await SecureStore.getItemAsync(MOCK_RIDER_KEY);
      if (stored) rider = JSON.parse(stored) as User;
    } else {
      await SecureStore.setItemAsync(MOCK_SCENARIO_KEY, MOCK_SCENARIO).catch(() => {});
      await SecureStore.deleteItemAsync(MOCK_RIDER_KEY).catch(() => {});
    }
  } catch {
    // Corrupt or inaccessible; keep the freshly seeded scenario.
  } finally {
    hydrated = true;
  }
})();

function setRider(next: User): User {
  rider = next;
  void SecureStore.setItemAsync(MOCK_RIDER_KEY, JSON.stringify(rider)).catch(() => {});
  void SecureStore.setItemAsync(MOCK_SCENARIO_KEY, activeScenario).catch(() => {});
  return rider;
}

// Where the simulated rider starts in the live scenario.
export function mockRiderStart(): { latitude: number; longitude: number } {
  return { latitude: riderStart.lat, longitude: riderStart.lng };
}

export function mockCurrentScenario(): MockScenario {
  return activeScenario;
}

// Hot-swaps every in-memory store to a fresh copy of the given scenario, for
// the floating dev switcher - no app reload needed. The caller (the switcher
// component) is responsible for invalidating react-query caches and updating
// the auth store's user afterward.
export function mockSwitchScenario(scenario: MockScenario): User {
  const data = seedScenario(scenario);
  activeScenario = scenario;
  rider = data.rider;
  poolOrders = data.pool;
  riderOrders = data.orders;
  orderIssues = data.issues ?? {};
  riderStart = data.riderStart ?? DEFAULT_RIDER_START;
  referredAway = new Set();
  CAPACITY_REQUESTS.length = 0;
  void SecureStore.setItemAsync(MOCK_RIDER_KEY, JSON.stringify(rider)).catch(() => {});
  void SecureStore.setItemAsync(MOCK_SCENARIO_KEY, scenario).catch(() => {});
  return rider;
}

// Simulates a new customer ordering near the rider mid-delivery, so the
// "incoming order joins your run" flow can be tried. Returns false when the
// pool already has something waiting.
let spawnCount = 0;
export function mockSpawnIncomingOrder(near: { latitude: number; longitude: number }): boolean {
  if (poolOrders.some((o) => !referredAway.has(o.id))) return false;
  spawnCount += 1;
  const sizes: CylinderSize[] = ['small', 'medium', 'large'];
  // About 1 km away, in a different direction each time.
  const angle = (spawnCount * 137 * Math.PI) / 180;
  const order = buildOrder({
    id: `order-incoming-${Date.now()}`,
    status: 'awaiting_rider',
    customer: `customer-incoming-${spawnCount}`,
    cylinderSize: sizes[spawnCount % sizes.length],
    deliveryAddress: {
      label: ['Dzorwulu, Accra', 'Roman Ridge, Accra', 'Abelemkpe, Accra', 'Kotobabi, Accra'][spawnCount % 4],
      lat: near.latitude + Math.sin(angle) * 0.009,
      lng: near.longitude + Math.cos(angle) * 0.009,
    },
    stationId: 'station-spintex',
    distanceKm: 2.4,
    paymentMethod: spawnCount % 2 === 0 ? 'cash' : 'paystack',
    tip: 300,
    createdMinutesAgo: 0,
  });
  poolOrders = [order, ...poolOrders];
  return true;
}

// Mirrors the real sign-out boundary: starts the next test run as a brand
// new, un-onboarded rider instead of resuming whatever state was saved.
export function mockResetRider(): void {
  rider = BLANK_RIDER;
  void SecureStore.deleteItemAsync(MOCK_RIDER_KEY).catch(() => {});
  void SecureStore.deleteItemAsync(MOCK_SCENARIO_KEY).catch(() => {});
}

// Lets the photo screen's dev bypass button skip straight past picking and
// uploading a photo.
export function mockSetPhoto(): User {
  return setRider({ ...rider, photoUrl: 'https://placehold.co/200x200' });
}

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
    return wait({ orders: rider.suspended ? [] : poolOrders.filter((o) => !referredAway.has(o.id)) } as T);
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
      customerId: mockCustomerFor(accepted.id),
      riderCommission: accepted.pricing.distanceFee,
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

  const referMatch = matchRoute('/rider/orders/:id/refer', path);
  if (referMatch && method === 'POST') {
    const index = riderOrders.findIndex((order) => order.id === referMatch.id);
    if (index === -1) throw notFound();
    const order = riderOrders[index];
    if (order.status !== 'rider_assigned') {
      throw new Error('This order has already been picked up and can no longer be referred.');
    }
    riderOrders.splice(index, 1);
    // Back to how a pool order looks: no customer contact, estimated earnings.
    const backInPool: ApiOrder = {
      ...order,
      status: 'awaiting_rider',
      customerId: typeof order.customerId === 'string' ? order.customerId : order.customerId.id,
      riderCommission: undefined,
      estimatedEarnings: order.riderCommission,
      platformFeeLocked: false,
      updatedAt: new Date().toISOString(),
    };
    poolOrders = [backInPool, ...poolOrders.filter((o) => o.id !== order.id)];
    referredAway.add(order.id);

    const nextRider: User = { ...rider, activeOrderCount: Math.max(0, rider.activeOrderCount - 1) };
    if (order.platformFeeLocked) {
      nextRider.walletLocked = Math.max(0, (nextRider.walletLocked ?? 0) - order.pricing.serviceFee);
    }
    setRider(nextRider);
    return wait({ order: backInPool, rider: nextRider } as T);
  }

  const cashMatch = matchRoute('/rider/orders/:id/cash-collected', path);
  if (cashMatch && method === 'POST') {
    const index = riderOrders.findIndex((order) => order.id === cashMatch.id);
    if (index !== -1) riderOrders[index] = { ...riderOrders[index], cashCollected: true };
    return wait({ payment: { id: `payment-${cashMatch.id}`, orderId: cashMatch.id, method: 'cash', amount: riderOrders[index]?.pricing.total ?? 0, currency: 'GHS', status: 'cash_collected' } } as T);
  }

  const issuesMatch = matchRoute('/rider/orders/:id/issues', path);
  if (issuesMatch && method === 'GET') {
    return wait({ issues: orderIssues[issuesMatch.id] ?? [] } as T);
  }
  if (issuesMatch && method === 'POST') {
    const { reasons, description } = (body ?? {}) as { reasons: IssueReason[]; description?: string };
    const issue: OrderIssueReport = {
      id: `issue-${issuesMatch.id}-${Date.now()}`,
      orderId: issuesMatch.id,
      riderId: rider.id,
      reasons,
      description,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    orderIssues = { ...orderIssues, [issuesMatch.id]: [...(orderIssues[issuesMatch.id] ?? []), issue] };
    return wait({ issue } as T);
  }

  if (match('/routing') && method === 'GET') {
    const from = { latitude: Number(query?.fromLat), longitude: Number(query?.fromLng) };
    const to = { latitude: Number(query?.toLat), longitude: Number(query?.toLng) };
    const path = mockRoadPath(from, to);
    let meters = 0;
    for (let i = 1; i < path.length; i++) {
      const dLat = (path[i].latitude - path[i - 1].latitude) * 111_000;
      const dLng = (path[i].longitude - path[i - 1].longitude) * 111_000 * Math.cos((from.latitude * Math.PI) / 180);
      meters += Math.hypot(dLat, dLng);
    }
    return wait({
      route: {
        distanceKm: meters / 1000,
        durationSeconds: Math.round(meters / 8),
        geometry: { type: 'LineString', coordinates: path.map((p) => [p.longitude, p.latitude]) },
      },
    } as T);
  }

  if (match('/rider/location') && method === 'PATCH') {
    return wait(undefined as T);
  }

  if (match('/contact') && method === 'POST') {
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
