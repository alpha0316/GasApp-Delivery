import { api } from '../../lib/api/client';
import type { ApiOrder, CapacityRequest } from '../../lib/api/types';

export const fetchPool = () => api<{ orders: ApiOrder[] }>('/rider/orders/available');

export const postAccept = (orderId: string) =>
  api<{ order: ApiOrder }>(`/rider/orders/${orderId}/accept`, { method: 'POST' });

export const postDecline = (orderId: string) => api<void>(`/rider/orders/${orderId}/decline`, { method: 'POST' });

export const postCapacityRequest = (requestedLimit: number, reason?: string) =>
  api<{ request: CapacityRequest }>('/rider/capacity-requests', {
    method: 'POST',
    body: { requestedLimit, ...(reason ? { reason } : {}) },
  });

export const fetchCapacityRequests = () => api<{ requests: CapacityRequest[] }>('/rider/capacity-requests');
