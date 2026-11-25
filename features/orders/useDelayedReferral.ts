import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../auth/store';
import { referOrder } from './api';
import { useRefreshAfterOrderChange } from './hooks';

// How long the rider has to undo "Refer To Other Riders" before it's sent.
export const REFER_UNDO_MS = 6000;

// Referring a queued order waits REFER_UNDO_MS before it reaches the server,
// so a mistaken tap can be undone. Meanwhile, and until the orders refetch
// confirms it, the order is hidden from the queue.
export function useDelayedReferral(onError: (error: unknown) => void) {
  const setUser = useAuthStore((s) => s.setUser);
  const refresh = useRefreshAfterOrderChange();
  const [pendingId, setPendingId] = useState<string | null>(null);
  // Sent to the server (or on the way); hidden until the refetch drops them.
  const [sentIds, setSentIds] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<string | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  // Kept in a ref so the unmount cleanup below sees the latest versions.
  const sendRef = useRef<(orderId: string) => void>(() => undefined);
  sendRef.current = (orderId: string) => {
    setSentIds((ids) => [...ids, orderId]);
    referOrder(orderId)
      .then(({ rider }) => setUser(rider))
      .catch((error) => {
        // Not referred after all: show it in the queue again.
        setSentIds((ids) => ids.filter((id) => id !== orderId));
        onErrorRef.current(error);
      })
      .finally(refresh);
  };

  const clearPending = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pendingRef.current = null;
    setPendingId(null);
  };

  const refer = useCallback((orderId: string) => {
    // A second referral while one is waiting sends the first straight away.
    const previous = pendingRef.current;
    clearPending();
    if (previous) sendRef.current(previous);

    pendingRef.current = orderId;
    setPendingId(orderId);
    timer.current = setTimeout(() => {
      clearPending();
      sendRef.current(orderId);
    }, REFER_UNDO_MS);
  }, []);

  const undo = useCallback(() => clearPending(), []);

  // Leaving the screen mid-countdown still sends it: the rider chose to refer.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (pendingRef.current) sendRef.current(pendingRef.current);
    },
    []
  );

  const hiddenIds = pendingId ? [...sentIds, pendingId] : sentIds;
  return { refer, undo, pendingId, hiddenIds };
}
