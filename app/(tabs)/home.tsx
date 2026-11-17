import React from 'react';
import { useAuthStore } from '../../features/auth/store';
import BatchOrderHomeScreen from '../../features/pool/screens/BatchOrderHomeScreen';
import RiderHomeScreen from '../../features/pool/screens/RiderHomeScreen';
import { riderModeFor } from '../../features/pool/vehicleMode';

// The vehicle picked during onboarding decides which home screen a rider
// gets: a motorbike/bicycle rider works one order at a time, a tricycle or
// car rider works a batch queue.
export default function Home() {
  const vehicleType = useAuthStore((s) => s.user?.vehicleType);
  return riderModeFor(vehicleType) === 'batch' ? <BatchOrderHomeScreen /> : <RiderHomeScreen />;
}
