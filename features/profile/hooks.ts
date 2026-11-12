import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../auth/store';
import { fetchAreas, fetchProfile, patchProfile, setRiderStatus, type ProfilePatch } from './api';

export const profileKey = ['rider', 'profile'] as const;

export function useProfile() {
  return useQuery({ queryKey: profileKey, queryFn: fetchProfile });
}

export function useAreas() {
  return useQuery({ queryKey: ['areas'], queryFn: fetchAreas, staleTime: 60 * 60 * 1000 });
}

export function useUpdateProfile() {
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfilePatch) => patchProfile(patch),
    onSuccess: ({ rider }) => {
      setUser(rider);
      void queryClient.invalidateQueries({ queryKey: profileKey });
    },
  });
}

export function useSetRiderStatus() {
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: 'available' | 'offline') => setRiderStatus(status),
    onSuccess: ({ rider }) => {
      setUser(rider);
      void queryClient.invalidateQueries({ queryKey: profileKey });
    },
  });
}
