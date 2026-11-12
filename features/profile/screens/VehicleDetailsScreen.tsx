import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import PrimaryButton from '../../../components/PrimaryButton';
import BackButton from '../../../components/BackButton';
import { errorMessage } from '../../../lib/api/client';
import type { VehicleType } from '../../../lib/api/types';
import { nextRoute } from '../../auth/nextRoute';
import { useAuthStore } from '../../auth/store';
import { useAreas, useUpdateProfile } from '../hooks';

const VEHICLES: { value: VehicleType; label: string }[] = [
  { value: 'motorbike', label: 'Motorbike' },
  { value: 'tricycle', label: 'Tricycle' },
  { value: 'car', label: 'Car' },
  { value: 'bicycle', label: 'Bicycle' },
];

export default function VehicleDetailsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const areas = useAreas();
  const updateProfile = useUpdateProfile();

  const [vehicleType, setVehicleType] = useState<VehicleType | undefined>(user?.vehicleType);
  const [plateNumber, setPlateNumber] = useState(user?.plateNumber ?? '');
  const [areaId, setAreaId] = useState<string | undefined>(user?.areaId);

  const plateValid = plateNumber.trim().length >= 2 && plateNumber.trim().length <= 20;
  const isButtonDisabled = !vehicleType || !areaId || !plateValid || updateProfile.isPending;

  const handleContinue = async () => {
    if (!vehicleType || !areaId) return;
    try {
      const { rider } = await updateProfile.mutateAsync({
        vehicleType,
        areaId,
        plateNumber: plateNumber.trim(),
      });
      router.replace(nextRoute(rider));
    } catch (error) {
      Alert.alert('Error', errorMessage(error));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <BackButton />
        </View>

      <View style={styles.content}>
        <View style={styles.titleGroup}>
          <Text style={styles.title}>Your vehicle</Text>
          <Text style={styles.subtitle}>Tell us how you deliver and where you work.</Text>
        </View>

        <Text style={styles.label}>Vehicle Type</Text>
        <View style={styles.chipRow}>
          {VEHICLES.map((vehicle) => {
            const selected = vehicle.value === vehicleType;
            return (
              <TouchableOpacity
                key={vehicle.value}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setVehicleType(vehicle.value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{vehicle.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Plate Number</Text>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: plateNumber ? '#000' : 'rgba(0, 0, 0, 0.20)',
              backgroundColor: plateNumber ? '#fff' : '#F4F4F4',
            },
          ]}
          value={plateNumber}
          onChangeText={setPlateNumber}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={20}
          placeholder="Enter your plate number"
          placeholderTextColor="rgba(0,0,0,.5)"
          returnKeyType="done"
          accessibilityLabel="Plate Number"
        />

        <Text style={styles.label}>Area</Text>
        {areas.isError && <Text style={styles.errorText}>{errorMessage(areas.error)}</Text>}
        <View style={styles.chipRow}>
          {(areas.data?.areas ?? []).map((area) => {
            const selected = area.id === areaId;
            return (
              <TouchableOpacity
                key={area.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setAreaId(area.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{area.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <PrimaryButton
          title={updateProfile.isPending ? 'Saving...' : 'Continue'}
          disabled={isButtonDisabled}
          onPress={handleContinue}
          style={styles.continueButton}
        />
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  content: {
    marginTop: 32,
    gap: 12,
  },
  titleGroup: {
    gap: 4,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(0,0,0,0.6)',
  },
  label: {
    fontSize: 16,
  },
  input: {
    height: 50,
    borderWidth: 1,
    padding: 8,
    borderRadius: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  chipTextSelected: {
    color: '#fff',
  },
  errorText: {
    color: '#B42318',
    fontSize: 13,
  },
  continueButton: {
    marginTop: 16,
  },
});
