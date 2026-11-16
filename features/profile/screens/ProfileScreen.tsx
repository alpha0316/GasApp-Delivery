import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CaretRight, SignOut, User as UserIcon } from 'phosphor-react-native';
import { errorMessage } from '../../../lib/api/client';
import { useAuthStore } from '../../auth/store';
import VehicleForm, { type VehicleFormValue } from '../components/VehicleForm';
import { useUpdateProfile } from '../hooks';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const updateProfile = useUpdateProfile();

  const [value, setValue] = useState<VehicleFormValue>({
    vehicleType: user?.vehicleType,
    plateNumber: user?.plateNumber ?? '',
    cylinderCapacity: user?.cylinderCapacity ?? 4,
    areaId: user?.areaId,
  });

  const plateValid = value.plateNumber.trim().length >= 2 && value.plateNumber.trim().length <= 20;
  const dirty =
    value.vehicleType !== user?.vehicleType ||
    value.plateNumber.trim() !== (user?.plateNumber ?? '') ||
    value.areaId !== user?.areaId ||
    value.cylinderCapacity !== user?.cylinderCapacity;

  const handleSave = async () => {
    if (!value.vehicleType || !value.areaId || !plateValid) return;
    try {
      await updateProfile.mutateAsync({
        vehicleType: value.vehicleType,
        areaId: value.areaId,
        plateNumber: value.plateNumber.trim(),
        cylinderCapacity: value.cylinderCapacity,
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

        <VehicleForm value={value} onChange={setValue} />

        <TouchableOpacity
          style={[styles.saveButton, (!dirty || !value.vehicleType || !value.areaId || !plateValid) && styles.saveButtonDisabled]}
          disabled={!dirty || !value.vehicleType || !value.areaId || !plateValid || updateProfile.isPending}
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
