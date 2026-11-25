import type { ImageSourcePropType } from 'react-native';
import type { VehicleType } from './api/types';

export interface VehicleInfo {
  label: string;
  // Side/3-quarter view shown on the vehicle picker and other UI cards.
  image: ImageSourcePropType;
  // Top-down (bird's-eye) view drawn on the tracking map. Every image faces
  // north so a compass heading can be applied as a plain rotation.
  mapImage: ImageSourcePropType;
  // mapImage width / height, so the marker keeps the vehicle's proportions.
  mapAspect: number;
  // Marker length relative to the base marker size: bigger vehicles read
  // bigger on the map.
  mapScale: number;
}

const MOTORBIKE: VehicleInfo = {
  label: 'Motorbike',
  image: require('../assets/images/order-card/bike-rider.png'),
  mapImage: require('../assets/images/vehicles/motorbike-top.png'),
  mapAspect: 1,
  mapScale: 1.1,
};

export const VEHICLES: Record<VehicleType, VehicleInfo> = {
  motorbike: MOTORBIKE,
  tricycle: {
    label: 'Tricycle',
    image: require('../assets/images/vehicles/tricycle.png'),
    mapImage: require('../assets/images/vehicles/tricycle-top.png'),
    mapAspect: 178 / 268,
    mapScale: 1.25,
  },
  car: {
    label: 'Car',
    image: require('../assets/images/vehicles/car.png'),
    mapImage: require('../assets/images/vehicles/car-top.png'),
    mapAspect: 150 / 269,
    mapScale: 1.25,
  },
  truck: {
    label: 'Truck',
    image: require('../assets/images/vehicles/truck.png'),
    mapImage: require('../assets/images/vehicles/truck-top.png'),
    mapAspect: 286 / 429,
    mapScale: 1.5,
  },
  // Not offered in the picker; reuses the rider art so the map still works.
  bicycle: { ...MOTORBIKE, label: 'Bicycle' },
};

// Order the picker shows them in.
export const SELECTABLE_VEHICLES: VehicleType[] = ['motorbike', 'tricycle', 'car', 'truck'];

export function vehicleInfo(vehicleType: VehicleType | undefined): VehicleInfo {
  return (vehicleType && VEHICLES[vehicleType]) || MOTORBIKE;
}
