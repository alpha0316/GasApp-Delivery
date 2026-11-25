// The settings screens reach the rest of the rider app only through these functions:
// the signed-in rider, saving their name/email, and POST /contact.
import { api } from '../../lib/api/client';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../auth/store';
import { updateName } from '../auth/api';

export { errorMessage } from '../../lib/api/client';

export interface ContactInput {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
}

export function useKitUser() {
  return useAuthStore((s) => s.user);
}

// PATCH /me, then keep the auth store's user in step so every screen sees the change.
export async function saveNameAndEmail(firstName: string, lastName: string, email?: string): Promise<void> {
  const { user } = await updateName(firstName, lastName, email);
  useAuthStore.getState().setUser(user);
}

// POST /contact: the same endpoint as the customer app. It lands on the dashboard's Messages
// page and support replies by email.
export async function sendContactMessage(input: ContactInput): Promise<void> {
  await api<void>('/contact', { method: 'POST', body: input });
}

interface SupportSettings {
  contact?: { phones?: { number: string; isWhatsApp: boolean }[] };
}

export function useSupportContact(): { phone?: string; whatsApp?: string } {
  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api<{ settings: SupportSettings }>('/pricing/settings').then((r) => r.settings),
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const phones = data?.contact?.phones ?? [];
  return { phone: phones[0]?.number, whatsApp: phones.find((p) => p.isWhatsApp)?.number };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (value: string) => EMAIL_PATTERN.test(value.trim());
