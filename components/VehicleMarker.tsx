import React, { useEffect, useRef } from 'react';
import { View, Image, Animated, StyleSheet, Dimensions } from 'react-native';
import type { VehicleType } from '../lib/api/types';
import { vehicleInfo } from '../lib/vehicles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Scale with screen width so the marker reads at a consistent relative size
// across phone/tablet, clamped to sane bounds.
const BASE_SIZE = Math.max(28, Math.min(44, SCREEN_WIDTH * 0.1));

type Props = {
  vehicleType: VehicleType | undefined;
  // Compass heading in degrees (0 = north) the vehicle should face, kept in
  // sync with the rider's direction of travel along the route.
  rotation?: number;
};

// The rider's position on the tracking map: a top-down view of their vehicle
// over a pulsing ring.
export default function VehicleMarker({ vehicleType, rotation = 0 }: Props) {
  const vehicle = vehicleInfo(vehicleType);
  const length = BASE_SIZE * vehicle.mapScale;
  const width = length * vehicle.mapAspect;
  // The circle must hold the vehicle at any rotation.
  const backdropSize = length + 10;
  const ringSize = backdropSize * 2;

  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.45, 0.15, 0] });

  return (
    <View style={[styles.wrap, { width: ringSize, height: ringSize }]}>
      <Animated.View
        style={[
          styles.ring,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />
      <View style={[styles.backdrop, { width: backdropSize, height: backdropSize, borderRadius: backdropSize / 2 }]}>
        <Image
          source={vehicle.mapImage}
          style={{ width, height: length, transform: [{ rotate: `${rotation}deg` }] }}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    backgroundColor: '#22C55E',
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
