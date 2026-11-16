import type { CylinderSize } from '../api/types';

// Mirrors "Payment Flow & Order Assignment Logic" v1.0 (Nov 2026), section 1.4.
// All amounts are minor units (pesewas).

export const PLATFORM_FEE_BY_SIZE: Record<CylinderSize, number> = {
  small: 500,
  medium: 800,
  large: 1200,
};

export function deliveryFeeForDistanceKm(distanceKm: number): number {
  if (distanceKm <= 3) return 800;
  if (distanceKm <= 6) return 1300;
  if (distanceKm <= 10) return 1800;
  return 2500;
}

// The rider wallet float model that guarantees GasApp's commission on cash
// orders (section 3.1): a minimum balance to go online, and a lower
// threshold that triggers a low-balance alert.
export const MIN_WALLET_BALANCE = 5000;
export const LOW_WALLET_BALANCE_ALERT = 2000;
