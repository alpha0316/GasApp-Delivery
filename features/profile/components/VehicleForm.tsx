import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  PanResponder,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { Minus, Plus } from 'phosphor-react-native';
import { errorMessage } from '../../../lib/api/client';
import type { Area, VehicleType } from '../../../lib/api/types';
import { distanceMeters } from '../../../utils/geo';
import { useAreas } from '../hooks';

const VEHICLES: { value: VehicleType; label: string; image: ImageSourcePropType }[] = [
  { value: 'motorbike', label: 'Motorbike', image: require('../../../assets/images/order-card/bike-rider.png') },
  { value: 'tricycle', label: 'Tricycle', image: require('../../../assets/images/vehicles/tricycle.png') },
  { value: 'car', label: 'Car', image: require('../../../assets/images/vehicles/car.png') },
];

const MAX_CYLINDERS: Partial<Record<VehicleType, number>> = {
  motorbike: 2,
  tricycle: 10,
  car: 10,
};
const DEFAULT_MAX_CYLINDERS = 10;
const MIN_CYLINDERS = 1;

export function maxCylindersFor(vehicleType: VehicleType | undefined): number {
  return (vehicleType && MAX_CYLINDERS[vehicleType]) ?? DEFAULT_MAX_CYLINDERS;
}

export interface VehicleFormValue {
  vehicleType: VehicleType | undefined;
  plateNumber: string;
  cylinderCapacity: number;
  areaId: string | undefined;
}

function nearestArea(areasList: Area[], point: { latitude: number; longitude: number }): Area | undefined {
  let closest: Area | undefined;
  let closestDistance = Infinity;
  for (const area of areasList) {
    const [lng, lat] = area.center.coordinates;
    const distance = distanceMeters(point, { latitude: lat, longitude: lng });
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = area;
    }
  }
  return closest;
}

type LocationState = 'locating' | 'done' | 'error';

// Picks the rider's area automatically from their current position instead
// of asking them to choose one.
function useAutoDetectedArea(areasList: Area[] | undefined) {
  const [areaId, setAreaId] = useState<string | undefined>(undefined);
  const [areaName, setAreaName] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<LocationState>('locating');
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!areasList || areasList.length === 0) return;
    let cancelled = false;

    (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          if (!cancelled) {
            setStatus('error');
            setError('Allow location access so we can detect your delivery area.');
          }
          return;
        }
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (cancelled) return;
        const match = nearestArea(areasList, position.coords);
        if (!match) {
          setStatus('error');
          setError('No delivery area is set up near you yet.');
          return;
        }
        setAreaId(match.id);
        setAreaName(match.name);
        setStatus('done');
      } catch (error) {
        if (!cancelled) {
          setStatus('error');
          setError(errorMessage(error));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [areasList]);

  return { areaId, areaName, status, error };
}

interface VehicleFormProps {
  value: VehicleFormValue;
  onChange: (value: VehicleFormValue) => void;
}

// The vehicle-type cards, plate number, cylinder-capacity slider/stepper and
// auto-detected delivery area. Shared by onboarding's vehicle step and the
// profile screen so editing a vehicle looks and behaves the same everywhere.
export default function VehicleForm({ value, onChange }: VehicleFormProps) {
  const areas = useAreas();
  const location = useAutoDetectedArea(areas.data?.areas);

  useEffect(() => {
    if (location.areaId && location.areaId !== value.areaId) {
      onChange({ ...value, areaId: location.areaId });
    }
    // Only react to the detected area changing; value/onChange intentionally excluded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.areaId]);

  const handleSelectVehicle = (vehicleType: VehicleType) => {
    onChange({
      ...value,
      vehicleType,
      cylinderCapacity: Math.min(value.cylinderCapacity, maxCylindersFor(vehicleType)),
    });
  };

  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.label}>Select Your Vehicle Type</Text>
      <View style={styles.vehicleRow}>
        {VEHICLES.map((vehicle) => {
          const selected = vehicle.value === value.vehicleType;
          return (
            <TouchableOpacity
              key={vehicle.value}
              style={[styles.vehicleCard, selected && styles.vehicleCardSelected]}
              onPress={() => handleSelectVehicle(vehicle.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Image source={vehicle.image} style={styles.vehicleImage} resizeMode="contain" />
              <Text style={styles.vehicleLabel}>{vehicle.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>Vehicle Plate Number</Text>
      <View
        style={[
          styles.input,
          {
            borderColor: value.plateNumber ? '#000' : 'rgba(0, 0, 0, 0.20)',
            backgroundColor: value.plateNumber ? '#fff' : '#F4F4F4',
          },
        ]}
      >
        <TextInput
          style={styles.inputText}
          value={value.plateNumber}
          onChangeText={(plateNumber) => onChange({ ...value, plateNumber })}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={20}
          placeholder="Enter your plate number"
          placeholderTextColor="rgba(0,0,0,.5)"
          returnKeyType="done"
          accessibilityLabel="Plate Number"
        />
      </View>

      <Text style={styles.label}>Maximum Number of Cylinders Per Order</Text>
      <View style={styles.cylinderRow}>
        <CylinderSlider
          value={value.cylinderCapacity}
          max={maxCylindersFor(value.vehicleType)}
          onChange={(cylinderCapacity) => onChange({ ...value, cylinderCapacity })}
        />
        <CylinderStepper
          value={value.cylinderCapacity}
          min={MIN_CYLINDERS}
          max={maxCylindersFor(value.vehicleType)}
          onChange={(cylinderCapacity) => onChange({ ...value, cylinderCapacity })}
        />
      </View>

      <View style={styles.locationRow}>
        {location.status === 'locating' && (
          <>
            <ActivityIndicator size="small" color="rgba(0,0,0,0.5)" />
            <Text style={styles.locationText}>Detecting your delivery area...</Text>
          </>
        )}
        {location.status === 'done' && <Text style={styles.locationText}>Delivery area: {location.areaName}</Text>}
        {location.status === 'error' && <Text style={styles.errorText}>{location.error}</Text>}
      </View>
    </View>
  );
}

interface CylinderSliderProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
}

function CylinderSlider({ value, max, onChange }: CylinderSliderProps) {
  const trackRef = useRef<View>(null);
  const trackPageX = useRef(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const clampedValue = Math.min(value, max);

  const measureTrack = () => {
    trackRef.current?.measure((_x, _y, _width, _height, pageX) => {
      trackPageX.current = pageX;
    });
  };

  const setFromPageX = (pageX: number) => {
    if (trackWidth <= 0 || max <= MIN_CYLINDERS) return;
    const x = pageX - trackPageX.current;
    const ratio = Math.min(1, Math.max(0, x / trackWidth));
    const next = Math.round(ratio * (max - MIN_CYLINDERS)) + MIN_CYLINDERS;
    onChange(next);
  };

  // pageX (not locationX) stays correctly anchored to the track for the
  // whole drag on both iOS and Android.
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        measureTrack();
        setFromPageX(event.nativeEvent.pageX);
      },
      onPanResponderMove: (_event, gestureState) => setFromPageX(gestureState.moveX),
    })
  ).current;

  const ratio = max > MIN_CYLINDERS ? (clampedValue - MIN_CYLINDERS) / (max - MIN_CYLINDERS) : 1;
  const fillWidth = trackWidth > 0 ? Math.max(44, ratio * trackWidth) : 0;
  // One divider between each pair of adjacent units; its color flips once it
  // crosses into the unfilled part of the track.
  const dividers = Array.from({ length: max - 1 }, (_, index) => {
    const x = ((index + 1) / max) * trackWidth;
    return { x, filled: x < fillWidth };
  });

  return (
    <View
      ref={trackRef}
      style={styles.sliderTrack}
      onLayout={(event) => {
        setTrackWidth(event.nativeEvent.layout.width);
        measureTrack();
      }}
      {...pan.panHandlers}
    >
      <View style={[styles.sliderFill, { width: fillWidth }]}>
        <Text style={styles.sliderValue}>{clampedValue}</Text>
      </View>
      {trackWidth > 0 && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {dividers.map((divider, index) => (
            <View
              key={index}
              style={[
                styles.sliderTick,
                divider.filled ? styles.sliderTickOnFill : styles.sliderTickOnTrack,
                { left: divider.x - 1 },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

interface CylinderStepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

function CylinderStepper({ value, min, max, onChange }: CylinderStepperProps) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        style={styles.stepperButton}
        onPress={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        accessibilityRole="button"
        accessibilityLabel="Decrease cylinder count"
      >
        <Minus size={16} color={value <= min ? 'rgba(0,0,0,0.2)' : '#000'} weight="bold" />
      </TouchableOpacity>
      <Text style={styles.stepperValue}>{value}</Text>
      <TouchableOpacity
        style={[styles.stepperButton, styles.stepperButtonPrimary, value >= max && styles.stepperButtonDisabled]}
        onPress={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        accessibilityRole="button"
        accessibilityLabel="Increase cylinder count"
      >
        <Plus size={16} color="#fff" weight="bold" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 16,
    marginTop: 8,
  },
  vehicleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  vehicleCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 8,
  },
  vehicleCardSelected: {
    borderColor: '#000',
    backgroundColor: '#fff',
  },
  vehicleImage: {
    width: 56,
    height: 56,
  },
  vehicleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
  },
  inputText: {
    paddingHorizontal: 8,
    fontSize: 16,
  },
  cylinderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderTrack: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sliderFill: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0A84FF',
    justifyContent: 'center',
    paddingLeft: 16,
  },
  sliderValue: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  sliderTick: {
    position: 'absolute',
    top: '28%',
    width: 2,
    height: '44%',
    borderRadius: 1,
  },
  sliderTickOnFill: {
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  sliderTickOnTrack: {
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F4F4F4',
    borderRadius: 24,
    paddingHorizontal: 8,
    height: 48,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  stepperButtonPrimary: {
    backgroundColor: '#0A84FF',
    borderWidth: 0,
  },
  stepperButtonDisabled: {
    backgroundColor: 'rgba(10,132,255,0.4)',
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 16,
    textAlign: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  locationText: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.6)',
  },
  errorText: {
    color: '#B42318',
    fontSize: 13,
  },
});
