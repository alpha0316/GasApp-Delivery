import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { ApiOrder, IssueReason, RiderTargetStatus } from '../../lib/api/types';
import { useAuthStore } from '../auth/store';
import { flaggedIdsFrom } from '../delivery/batch';
import { earningsKey } from '../earnings/hooks';
import { profileKey } from '../profile/hooks';
import type { CancelReason } from '../../lib/orders/cancelReasons';
import {
  cancelOrder,
  fetchOrderIssues,
  fetchRiderOrders,
  fetchStations,
  patchOrderStatus,
  postCashCollected,
  postOrderIssue,
} from './api';
import { advanceThrough, isActiveStatus, needsCashCall } from './flow';

export const ordersKey = ['rider', 'orders'] as const;

// scope=all holds both the queue and the history (newest 100).
export function useRiderOrders() {
  const approved = useAuthStore((s) => s.user?.isApproved ?? false);
  return useQuery({
    queryKey: ordersKey,
    queryFn: async () => (await fetchRiderOrders('all')).orders,
    enabled: approved,
  });
}

export function useActiveOrders(): { orders: ApiOrder[]; isLoading: boolean } {
  const query = useRiderOrders();
  const orders = useMemo(
    () =>
      (query.data ?? [])
        .filter((order) => isActiveStatus(order.status))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [query.data]
  );
  return { orders, isLoading: query.isLoading };
}

export function useStations() {
  return useQuery({
    queryKey: ['stations'],
    queryFn: async () => (await fetchStations()).stations,
    staleTime: 60 * 60 * 1000,
  });
}

export function useRefreshAfterOrderChange() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ordersKey });
    void queryClient.invalidateQueries({ queryKey: profileKey });
    void queryClient.invalidateQueries({ queryKey: earningsKey });
  };
}

// Moves an order forward, sending each missing step in order.
export function useAdvanceOrder() {
  const refresh = useRefreshAfterOrderChange();
  return useMutation({
    mutationFn: ({ order, target }: { order: ApiOrder; target: RiderTargetStatus }) =>
      advanceThrough(order, target, async (status) => (await patchOrderStatus(order.id, status)).order),
    onSettled: refresh,
  });
}

// Cash orders need the cash step before `delivered`. The server `cashCollected`
// flag says if it is done, because a second cash call gives 409. The call is not retried.
export function useCompleteDelivery() {
  const refresh = useRefreshAfterOrderChange();
  return useMutation({
    mutationFn: async (order: ApiOrder) => {
      if (needsCashCall(order)) await postCashCollected(order.id);
      return (await patchOrderStatus(order.id, 'delivered')).order;
    },
    onSettled: refresh,
  });
}

// Cancelling before pickup releases a cash order's locked platform fee, and
// an unexcused reason records a strike - both land on the rider record.
export function useCancelOrder() {
  const setUser = useAuthStore((s) => s.setUser);
  const refresh = useRefreshAfterOrderChange();
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: CancelReason }) => cancelOrder(orderId, reason),
    onSuccess: ({ rider }) => setUser(rider),
    onSettled: refresh,
  });
}

const issuesKey = (orderId: string) => ['rider', 'order-issues', orderId] as const;

// Orders with an open report, from the server. One request per active order.
export function useFlaggedIds(): Record<string, true> {
  const { orders } = useActiveOrders();
  return useQueries({
    queries: orders.map((order) => ({
      queryKey: issuesKey(order.id),
      queryFn: async () => (await fetchOrderIssues(order.id)).issues,
    })),
    combine: (results) =>
      flaggedIdsFrom(orders.map((order, i) => ({ orderId: order.id, issues: results[i]?.data ?? [] }))),
  });
}

export function useReportIssue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, reasons, description }: { orderId: string; reasons: IssueReason[]; description?: string }) =>
      postOrderIssue(orderId, reasons, description),
    onSuccess: (_result, { orderId }) => queryClient.invalidateQueries({ queryKey: issuesKey(orderId) }),
  });
}
