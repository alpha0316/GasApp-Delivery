import { errorMessage } from '../api/client';

// Accepting a pool order can lose a race (another rider took it, or its 30s
// offer window just expired) - the raw "order not found" is a dev-facing
// detail, not something a rider needs to parse.
export function orderAcceptErrorMessage(error: unknown): string {
  const message = errorMessage(error);
  if (message.toLowerCase().includes('order not found')) {
    return "This order was just taken or expired - it's no longer available.";
  }
  return message;
}
