import type { VehicleType } from '../../lib/api/types';

export type RiderMode = 'single' | 'batch';

// A motorbike (or bicycle) only has room for one order's cylinders at a
// time. A tricycle or car can carry several, so those riders work a batch
// queue instead of one order at a time.
const SINGLE_ORDER_VEHICLES: VehicleType[] = ['motorbike', 'bicycle'];

export function riderModeFor(vehicleType: VehicleType | undefined): RiderMode {
  if (!vehicleType) return 'single';
  return SINGLE_ORDER_VEHICLES.includes(vehicleType) ? 'single' : 'batch';
}
