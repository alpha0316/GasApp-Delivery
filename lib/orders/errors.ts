import { errorMessage } from '../api/client';

// Accepting a pool order can lose a race (another rider took it, or its 30s
// offer window just expired) - the raw "order not found" is a dev-facing
// detail, not something a rider needs to parse.
// True when the order is gone from the pool (taken by another rider, or its
// offer window expired), rather than the accept being refused for a reason
// the rider can fix (e.g. a low wallet).
export function isOrderGoneError(error: unknown): boolean {
  return errorMessage(error).toLowerCase().includes('order not found');
}

export function orderAcceptErrorMessage(error: unknown): string {
  const message = errorMessage(error);
  if (isOrderGoneError(error)) {
    return "This order was just taken or expired - it's no longer available.";
  }
  return message;
}
