import type { ApiOrder, CylinderSize as ApiCylinderSize, Station } from '../../lib/api/types';
import type { CylinderSize, LatLng, Order, QueueOrder, RecentOrder } from '../../types/order';

const SIZE_LABELS: Record<ApiCylinderSize, CylinderSize> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

export const toSizeLabel = (size: ApiCylinderSize): CylinderSize => SIZE_LABELS[size];

// GeoJSON is [lng, lat].
export const stationLatLng = (station: Station): LatLng => ({
  latitude: station.location.coordinates[1],
  longitude: station.location.coordinates[0],
});

export const customerLatLng = (order: ApiOrder): LatLng => ({
  latitude: order.deliveryAddress.lat,
  longitude: order.deliveryAddress.lng,
});

// The pool list does not include customer contact. It appears after accept.
function customerOf(order: ApiOrder) {
  if (typeof order.customerId === 'string') return { name: 'Customer', phone: '' };
  const name = `${order.customerId.firstName} ${order.customerId.lastName}`.trim();
  return { name: name || 'Customer', phone: order.customerId.phoneNumber ?? '' };
}

export function toOrderView(order: ApiOrder, stations: Station[] | undefined): Order {
  const station = stations?.find((s) => s.id === order.stationId);
  const customer = customerOf(order);
  const tip = order.pricing.tip;
  return {
    id: order.id,
    status: order.status,
    paymentMethod: order.paymentMethod,
    customerName: customer.name,
    customerPhone: customer.phone,
    cylinderSize: toSizeLabel(order.cylinderSize),
    cylinderCount: order.cylinderCount,
    amount: order.pricing.gasTotal,
    tip,
    total: order.pricing.total,
    earnings: order.estimatedEarnings ?? (order.riderCommission ?? 0) + tip,
    fillingStationName: station?.name ?? '',
    dropoffAddress: order.deliveryAddress.label,
    stationLocation: station ? stationLatLng(station) : null,
    customerLocation: customerLatLng(order),
  };
}

export function toQueueOrder(order: ApiOrder, status: QueueOrder['status']): QueueOrder {
  const customer = customerOf(order);
  return {
    id: order.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    area: order.deliveryAddress.label,
    cylinderSize: toSizeLabel(order.cylinderSize),
    amount: order.pricing.gasTotal,
    tip: order.pricing.tip,
    estimatedEarnings: order.estimatedEarnings ?? (order.riderCommission ?? 0) + order.pricing.tip,
    customerLocation: customerLatLng(order),
    status,
  };
}

function formatClock(date: Date): string {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const suffix = hours >= 12 ? 'pm' : 'am';
  return `${hours % 12 || 12}:${minutes}${suffix}`;
}

export function formatRecentTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) return `Today, ${formatClock(date)}`;
  return `${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}, ${formatClock(date)}`;
}

export function toRecentOrder(order: ApiOrder, now: Date = new Date()): RecentOrder | null {
  if (order.status !== 'delivered' && order.status !== 'cancelled') return null;
  const customer = customerOf(order);
  const size = toSizeLabel(order.cylinderSize);
  const completed = order.status === 'delivered';
  return {
    id: order.id,
    customerName: customer.name,
    area: `${order.deliveryAddress.label} · ${size}`,
    size,
    amount: order.pricing.gasTotal,
    status: completed ? 'completed' : 'cancelled',
    time: completed ? formatRecentTime(order.deliveredAt ?? order.updatedAt, now) : 'Cancelled',
  };
}
