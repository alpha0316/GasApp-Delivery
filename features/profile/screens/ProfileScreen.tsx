import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CaretRight, SignOut, User as UserIcon } from 'phosphor-react-native';
import { errorMessage } from '../../../lib/api/client';
import type { VehicleType } from '../../../lib/api/types';
import { useAuthStore } from '../../auth/store';
import { useAreas, useUpdateProfile } from '../hooks';

const VEHICLES: { value: VehicleType; label: string }[] = [
  { value: 'motorbike', label: 'Motorbike' },
  { value: 'tricycle', label: 'Tricycle' },
  { value: 'car', label: 'Car' },
  { value: 'bicycle', label: 'Bicycle' },
];

const CYLINDER_CAPACITIES = [1, 2, 3, 4, 5, 6];

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const areas = useAreas();
  const updateProfile = useUpdateProfile();

  const [vehicleType, setVehicleType] = useState<VehicleType | undefined>(user?.vehicleType);
  const [plateNumber, setPlateNumber] = useState(user?.plateNumber ?? '');
  const [areaId, setAreaId] = useState<string | undefined>(user?.areaId);
  const [cylinderCapacity, setCylinderCapacity] = useState<number | undefined>(user?.cylinderCapacity);

  const plateValid = plateNumber.trim().length >= 2 && plateNumber.trim().length <= 20;
  const dirty =
    vehicleType !== user?.vehicleType ||
    plateNumber.trim() !== (user?.plateNumber ?? '') ||
    areaId !== user?.areaId ||
    cylinderCapacity !== user?.cylinderCapacity;

  const handleSave = async () => {
    if (!vehicleType || !areaId || !plateValid) return;
    try {
      await updateProfile.mutateAsync({
        vehicleType,
        areaId,
        plateNumber: plateNumber.trim(),
        cylinderCapacity,
      });
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (error) {
      Alert.alert('Error', errorMessage(error));
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile</Text>

        <TouchableOpacity style={styles.profileRow} onPress={() => router.push('/photo')}>
          {user?.photoUrl ? (
            <Image source={{ uri: user.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <UserIcon size={26} color="rgba(0,0,0,0.3)" weight="fill" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={styles.editPhoto}>Edit photo</Text>
          </View>
          <CaretRight size={18} color="rgba(0,0,0,0.3)" />
        </TouchableOpacity>

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

        <Text style={styles.label}>Cylinders you can carry</Text>
        <View style={styles.chipRow}>
          {CYLINDER_CAPACITIES.map((count) => {
            const selected = count === cylinderCapacity;
            return (
              <TouchableOpacity
                key={count}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setCylinderCapacity(count)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {count}
                  {count === CYLINDER_CAPACITIES[CYLINDER_CAPACITIES.length - 1] ? '+' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Plate Number</Text>
        <TextInput
          style={styles.input}
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

        <TouchableOpacity
          style={[styles.saveButton, (!dirty || !vehicleType || !areaId || !plateValid) && styles.saveButtonDisabled]}
          disabled={!dirty || !vehicleType || !areaId || !plateValid || updateProfile.isPending}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>{updateProfile.isPending ? 'Saving...' : 'Save changes'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutRow} onPress={handleSignOut}>
          <SignOut size={18} color="#B42318" weight="bold" />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#FAFAFA',
    marginBottom: 8,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  editPhoto: {
    fontSize: 12,
    color: '#0085FF',
    fontWeight: '600',
    marginTop: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
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
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    padding: 8,
    borderRadius: 12,
  },
  errorText: {
    color: '#B42318',
    fontSize: 13,
  },
  saveButton: {
    backgroundColor: '#000',
    borderRadius: 24,
    alignItems: 'center',
    height: 55,
    justifyContent: 'center',
    marginTop: 16,
  },
  saveButtonDisabled: {
    backgroundColor: '#A0A0A0',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  signOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
  },
  signOutText: {
    color: '#B42318',
    fontSize: 15,
    fontWeight: '700',
  },
});
