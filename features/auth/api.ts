import { api } from '../../lib/api/client';
import type { User } from '../../lib/api/types';

export const requestOtp = (phone: string) =>
  api<void>('/auth/otp/request', { method: 'POST', body: { channel: 'sms', target: phone } });

export const verifyOtp = (phone: string, code: string) =>
  api<{ token: string; user: User; isNewUser: boolean }>('/auth/otp/verify', {
    method: 'POST',
    body: { channel: 'sms', target: phone, code, role: 'rider' },
  });

export const fetchMe = () => api<{ user: User }>('/me');

export const updateName = (firstName: string, lastName: string) =>
  api<{ user: User }>('/me', { method: 'PATCH', body: { firstName, lastName } });

export const registerPushToken = (token: string) => api<void>('/me/push-token', { method: 'POST', body: { token } });

export const removePushToken = (token: string) => api<void>('/me/push-token', { method: 'DELETE', body: { token } });
