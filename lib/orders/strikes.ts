// Section 3.3: 3 unexcused cancellations within 7 days suspends the rider
// (pending admin review); each one also reduces assignment priority for 24h.
export const STRIKE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const SUSPENSION_STRIKE_THRESHOLD = 3;
export const PRIORITY_REDUCTION_WINDOW_MS = 24 * 60 * 60 * 1000;

export function hasReducedPriority(strikeHistory: string[] | undefined): boolean {
  if (!strikeHistory || strikeHistory.length === 0) return false;
  const cutoff = Date.now() - PRIORITY_REDUCTION_WINDOW_MS;
  return strikeHistory.some((timestamp) => new Date(timestamp).getTime() > cutoff);
}
