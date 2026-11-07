import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../auth/store';
import { fetchEarnings } from './api';

export const earningsKey = ['rider', 'earnings'] as const;

export function useEarnings() {
  const approved = useAuthStore((s) => s.user?.isApproved ?? false);
  return useQuery({
    queryKey: earningsKey,
    queryFn: async () => (await fetchEarnings()).totals,
    enabled: approved,
  });
}
