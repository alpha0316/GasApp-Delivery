import { api } from '../../lib/api/client';
import type {
  ApiOrder,
  IssueReason,
  OrderIssueReport,
  Payment,
  RiderTargetStatus,
  RouteResult,
  Station,
} from '../../lib/api/types';

export const fetchRiderOrders = (scope: 'active' | 'all') =>
  api<{ orders: ApiOrder[] }>('/rider/orders', { query: { scope } });

export const patchOrderStatus = (orderId: string, status: RiderTargetStatus) =>
  api<{ order: ApiOrder }>(`/rider/orders/${orderId}/status`, { method: 'PATCH', body: { status } });

export const postCashCollected = (orderId: string) =>
  api<{ payment: Payment }>(`/rider/orders/${orderId}/cash-collected`, { method: 'POST' });

export const postOrderIssue = (orderId: string, reasons: IssueReason[], description?: string) =>
  api<{ issue: OrderIssueReport }>(`/rider/orders/${orderId}/issues`, {
    method: 'POST',
    body: { reasons, ...(description ? { description } : {}) },
  });

export const fetchOrderIssues = (orderId: string) =>
  api<{ issues: OrderIssueReport[] }>(`/rider/orders/${orderId}/issues`);

export const fetchStations = () => api<{ stations: Station[] }>('/stations');

export const fetchRoute = (from: { lat: number; lng: number }, to: { lat: number; lng: number }) =>
  api<{ route: RouteResult }>('/routing', {
    query: { fromLat: from.lat, fromLng: from.lng, toLat: to.lat, toLng: to.lng },
  });
