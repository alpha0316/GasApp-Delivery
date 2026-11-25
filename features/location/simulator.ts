import { useEffect } from 'react';
import { create } from 'zustand';
import { MOCK_API, mockRiderStart } from '../../lib/api/devMock';
import type { VehicleType } from '../../lib/api/types';
import { mockRoadPath } from '../../lib/sim/mockRoute';
import type { LatLng } from '../../types/order';
import { bearingBetween, distanceMeters } from '../../utils/geo';
import { useLocationStore } from './store';

// Dev-only drive simulator. While the mock API is on there is no real GPS:
// this moves the rider along a fake road to whatever the tracking screen is
// heading for, so every leg of a delivery plays out on the map.

// Matches useAnimatedRiderCoordinate's glide so the marker moves smoothly.
const TICK_MS = 1000;

// Simulated speeds in metres per second, sped up so a demo leg takes seconds,
// not minutes. Bigger vehicles move slower.
const SPEED_MPS: Record<VehicleType, number> = {
  motorbike: 120,
  bicycle: 70,
  car: 110,
  tricycle: 90,
  truck: 80,
};

// No leg takes longer than this, however far apart the points are.
const MAX_LEG_SECONDS = 25;

interface SimState {
  // What's left of the current drive, starting at the rider; empty when parked.
  remainingPath: LatLng[];
  driving: boolean;
}

export const useSimStore = create<SimState>(() => ({ remainingPath: [], driving: false }));

let timer: ReturnType<typeof setInterval> | null = null;
let currentTarget: LatLng | null = null;

function pathLength(path: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += distanceMeters(path[i - 1], path[i]);
  return total;
}

// Walks `meters` along `path`, returning the new point, the heading of the
// segment it ends on, and the rest of the path from there.
function advanceAlong(path: LatLng[], meters: number): { point: LatLng; heading: number; rest: LatLng[] } {
  let left = meters;
  for (let i = 1; i < path.length; i++) {
    const from = path[i - 1];
    const to = path[i];
    const segment = distanceMeters(from, to);
    if (segment === 0) continue;
    const heading = bearingBetween(from, to);
    if (left < segment) {
      const t = left / segment;
      const point = {
        latitude: from.latitude + (to.latitude - from.latitude) * t,
        longitude: from.longitude + (to.longitude - from.longitude) * t,
      };
      return { point, heading, rest: [point, ...path.slice(i)] };
    }
    left -= segment;
  }
  const last = path[path.length - 1];
  const prev = path.length > 1 ? path[path.length - 2] : last;
  return { point: last, heading: bearingBetween(prev, last), rest: [last] };
}

export function stopDrive() {
  if (timer) clearInterval(timer);
  timer = null;
  currentTarget = null;
  useSimStore.setState({ remainingPath: [], driving: false });
}

export function driveTo(target: LatLng, vehicleType: VehicleType | undefined) {
  const location = useLocationStore.getState();
  const start = location.position ?? mockRiderStart();
  if (currentTarget && distanceMeters(currentTarget, target) < 5 && timer) return;
  stopDrive();
  if (distanceMeters(start, target) < 5) {
    location.setPosition(target, location.heading);
    return;
  }

  currentTarget = target;
  let path = mockRoadPath(start, target);
  const speed = Math.max(SPEED_MPS[vehicleType ?? 'motorbike'], pathLength(path) / MAX_LEG_SECONDS);
  useSimStore.setState({ remainingPath: path, driving: true });

  const tick = () => {
    const { point, heading, rest } = advanceAlong(path, speed * (TICK_MS / 1000));
    path = rest;
    useLocationStore.getState().setPosition(point, heading);
    if (rest.length <= 1) {
      stopDrive();
      return;
    }
    useSimStore.setState({ remainingPath: rest });
  };
  tick();
  timer = setInterval(tick, TICK_MS);
}

// Drives the simulated rider toward `target` while it's set. A no-op unless
// the mock API is on.
export function useSimulatedDrive(target: LatLng | null, vehicleType: VehicleType | undefined) {
  const lat = target?.latitude;
  const lng = target?.longitude;

  useEffect(() => {
    if (!MOCK_API) return;
    const location = useLocationStore.getState();
    if (!location.position) location.setPosition(mockRiderStart(), 0);
    if (lat === undefined || lng === undefined) {
      stopDrive();
      return;
    }
    driveTo({ latitude: lat, longitude: lng }, vehicleType);
  }, [lat, lng, vehicleType]);

  useEffect(() => () => stopDrive(), []);
}
