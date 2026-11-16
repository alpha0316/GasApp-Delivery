import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import PrimaryButton from '../../../components/PrimaryButton';
import BackButton from '../../../components/BackButton';
import { errorMessage } from '../../../lib/api/client';
import { nextRoute } from '../../auth/nextRoute';
import { useAuthStore } from '../../auth/store';
import VehicleForm, { type VehicleFormValue } from '../components/VehicleForm';
import { useUpdateProfile } from '../hooks';

export default function VehicleDetailsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useUpdateProfile();

  const [value, setValue] = useState<VehicleFormValue>({
    vehicleType: user?.vehicleType,
    plateNumber: user?.plateNumber ?? '',
    cylinderCapacity: user?.cylinderCapacity ?? 4,
    areaId: user?.areaId,
  });

  const plateValid = value.plateNumber.trim().length >= 2 && value.plateNumber.trim().length <= 20;
  const isButtonDisabled = !value.vehicleType || !value.areaId || !plateValid || updateProfile.isPending;

  const handleContinue = async () => {
    if (!value.vehicleType || !value.areaId) return;
    try {
      const { rider } = await updateProfile.mutateAsync({
        vehicleType: value.vehicleType,
        areaId: value.areaId,
        plateNumber: value.plateNumber.trim(),
        cylinderCapacity: value.cylinderCapacity,
      });
      router.replace(nextRoute(rider));
    } catch (error) {
      Alert.alert('Error', errorMessage(error));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Your Vehicle</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <VehicleForm value={value} onChange={setValue} />
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title={updateProfile.isPending ? 'Saving...' : 'Continue'}
          disabled={isButtonDisabled}
          onPress={handleContinue}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginRight: 40,
  },
  footer: {
    padding: 16,
    paddingTop: 8,
  },
});
