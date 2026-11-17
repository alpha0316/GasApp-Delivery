import { api } from '../../lib/api/client';
import type { Area, User, VehicleType } from '../../lib/api/types';

export interface ProfilePatch {
  vehicleType?: VehicleType;
  plateNumber?: string;
  photoUrl?: string;
  areaId?: string;
  cylinderCapacity?: number;
}

export const fetchProfile = () => api<{ rider: User; maxConcurrentOrders: number }>('/rider/profile');

export const patchProfile = (patch: ProfilePatch) =>
  api<{ rider: User }>('/rider/profile', { method: 'PATCH', body: patch });

export const fetchAreas = () => api<{ areas: Area[] }>('/areas');

export const setRiderStatus = (status: 'available' | 'offline') =>
  api<{ rider: User }>('/rider/status', { method: 'PATCH', body: { status } });

// amount is minor units (pesewas).
export const topUpWallet = (amount: number) => api<{ rider: User }>('/rider/wallet/topup', { method: 'POST', body: { amount } });

interface PhotoUploadTicket {
  uploadUrl: string;
  headers: Record<string, string>;
  expiresIn: number;
  photoUrl: string;
}

export const requestPhotoUpload = (contentType: string, contentLength: number) =>
  api<PhotoUploadTicket>('/rider/photo-upload', { method: 'POST', body: { contentType, contentLength } });
