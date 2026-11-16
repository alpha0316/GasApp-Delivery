// Section 3.3: cancelling with a valid reason (vehicle fault, emergency)
// carries no penalty. Anything else counts as unexcused.
export type CancelReason = 'vehicle_fault' | 'emergency' | 'other';

export const CANCEL_REASONS: { value: CancelReason; label: string }[] = [
  { value: 'vehicle_fault', label: 'Vehicle fault' },
  { value: 'emergency', label: 'Personal emergency' },
  { value: 'other', label: 'Other' },
];

const VALID_CANCEL_REASONS: CancelReason[] = ['vehicle_fault', 'emergency'];

export function isValidCancelReason(reason: CancelReason): boolean {
  return VALID_CANCEL_REASONS.includes(reason);
}
