import { useEffect, useRef } from 'react';

// Section 3.2: every order offer opens a 30-second acceptance window.
export const OFFER_WINDOW_MS = 30_000;

// Tracks when each pool-offer id was first seen locally, so every offer gets
// its own full 30s window regardless of when the backend created the order.
export function useOfferWindows(ids: string[]) {
  const seenAt = useRef<Record<string, number>>({});

  for (const id of ids) {
    if (!(id in seenAt.current)) seenAt.current[id] = Date.now();
  }

  useEffect(() => {
    const idSet = new Set(ids);
    for (const key of Object.keys(seenAt.current)) {
      if (!idSet.has(key)) delete seenAt.current[key];
    }
    // ids is a fresh array each render; compare by content via the join below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(',')]);

  return (id: string): string => new Date((seenAt.current[id] ?? Date.now()) + OFFER_WINDOW_MS).toISOString();
}
