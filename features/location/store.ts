import { create } from 'zustand';
import type { LatLng } from '../../types/order';

interface LocationState {
  position: LatLng | null;
  heading: number;
  error: string | null;
  setPosition: (position: LatLng, heading: number) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  position: null,
  heading: 0,
  error: null,
  setPosition: (position, heading) => set({ position, heading, error: null }),
  setError: (error) => set({ error }),
  clear: () => set({ position: null, heading: 0, error: null }),
}));
