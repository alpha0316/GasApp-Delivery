import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../auth/store';
import { ordersKey } from '../orders/hooks';
import { profileKey, useProfile } from '../profile/hooks';
import { errorMessage } from '../../lib/api/client';
import type { ApiOrder } from '../../lib/api/types';
import { isOrderGoneError } from '../../lib/orders/errors';
import { fetchCapacityRequests, fetchPool, postAccept, postCapacityRequest, postDecline } from './api';

export const poolKey = ['rider', 'pool'] as const;
export const capacityKey = ['rider', 'capacity'] as const;

// Drops orders from the cached pool straight away. Invalidating alone leaves
// the old list on screen until the refetch lands, long enough for a screen
// to offer an order the rider has just accepted or declined.
function removeFromPool(queryClient: ReturnType<typeof useQueryClient>, orderIds: string[]) {
  if (orderIds.length === 0) return;
  queryClient.setQueryData<ApiOrder[]>(poolKey, (orders) => orders?.filter((o) => !orderIds.includes(o.id)));
}

// The pool works only for an approved rider who is online with a fresh location.
// The server answers 409 otherwise, and the message explains why.
export function usePool() {
  const approved = useAuthStore((s) => s.user?.isApproved ?? false);
  const profile = useProfile();
  const online = (profile.data?.rider.riderStatus ?? 'offline') !== 'offline';
  return useQuery({
    queryKey: poolKey,
    queryFn: async () => (await fetchPool()).orders,
    enabled: approved && online,
    retry: false,
  });
}

export function useAcceptOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => postAccept(orderId),
    onSuccess: (_data, orderId) => removeFromPool(queryClient, [orderId]),
    // Taken by someone else or expired: it won't come back, so stop offering it.
    onError: (error, orderId) => {
      if (isOrderGoneError(error)) removeFromPool(queryClient, [orderId]);
    },
    // A 409 means another rider was first, so the list is refreshed either way.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: poolKey });
      void queryClient.invalidateQueries({ queryKey: ordersKey });
      void queryClient.invalidateQueries({ queryKey: profileKey });
    },
  });
}

// Accepts orders one by one: the server checks the order limit on each call.
export function useAcceptMany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderIds: string[]) => {
      const accepted: string[] = [];
      const failures: string[] = [];
      for (const orderId of orderIds) {
        try {
          accepted.push((await postAccept(orderId)).order.id);
        } catch (error) {
          failures.push(errorMessage(error));
        }
      }
      return { accepted, failures };
    },
    onSuccess: ({ accepted }) => removeFromPool(queryClient, accepted),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: poolKey });
      void queryClient.invalidateQueries({ queryKey: ordersKey });
      void queryClient.invalidateQueries({ queryKey: profileKey });
    },
  });
}

export function useDeclineOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => postDecline(orderId),
    onSuccess: (_data, orderId) => removeFromPool(queryClient, [orderId]),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: poolKey });
    },
  });
}

export function useCapacityRequests() {
  const approved = useAuthStore((s) => s.user?.isApproved ?? false);
  return useQuery({
    queryKey: capacityKey,
    queryFn: async () => (await fetchCapacityRequests()).requests,
    enabled: approved,
  });
}

export function useRequestCapacity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestedLimit, reason }: { requestedLimit: number; reason?: string }) =>
      postCapacityRequest(requestedLimit, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: capacityKey });
    },
  });
}
