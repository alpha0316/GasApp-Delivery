import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { User, Camera, Image as ImageIcon } from 'phosphor-react-native';
import PrimaryButton from '../../../components/PrimaryButton';
import BackButton from '../../../components/BackButton';
import { errorMessage } from '../../../lib/api/client';
import { MOCK_API, mockSetPhoto } from '../../../lib/api/devMock';
import { nextRoute } from '../../auth/nextRoute';
import { useAuthStore } from '../../auth/store';
import { uploadProfilePhoto } from '../uploadPhoto';

interface PickedPhoto {
  uri: string;
  mimeType?: string;
}

export default function ProfilePhotoScreen() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [saving, setSaving] = useState(false);

  const isButtonDisabled = !photo || saving;

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Allow camera access to take a profile photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhoto({ uri: result.assets[0].uri, mimeType: result.assets[0].mimeType });
    }
  };

  const handleChooseFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo library access to choose a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhoto({ uri: result.assets[0].uri, mimeType: result.assets[0].mimeType });
    }
  };

  const handleContinue = async () => {
    if (!photo) return;
    setSaving(true);
    try {
      const rider = await uploadProfilePhoto(photo.uri, photo.mimeType);
      setUser(rider);
      router.replace(nextRoute(rider));
    } catch (error) {
      Alert.alert('Error', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDevSkip = () => {
    const rider = mockSetPhoto();
    setUser(rider);
    router.replace(nextRoute(rider));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <BackButton />
      </View>

      <View style={styles.content}>
        <View style={styles.titleGroup}>
          <Text style={styles.title}>Add a profile photo</Text>
          <Text style={styles.subtitle}>Customers see this when you arrive to pick up or deliver.</Text>
        </View>

        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            {photo ? (
              <Image source={{ uri: photo.uri }} style={styles.avatarImage} />
            ) : (
              <User size={40} color="rgba(0,0,0,0.3)" weight="fill" />
            )}
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleTakePhoto}>
            <Camera size={18} color="#000" weight="bold" />
            <Text style={styles.actionText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleChooseFromLibrary}>
            <ImageIcon size={18} color="#000" weight="bold" />
            <Text style={styles.actionText}>Choose from Library</Text>
          </TouchableOpacity>
        </View>

        <PrimaryButton
          title={saving ? 'Saving...' : 'Continue'}
          disabled={isButtonDisabled}
          onPress={handleContinue}
          style={styles.continueButton}
        />

        {MOCK_API && <PrimaryButton title="Skip photo (dev)" onPress={handleDevSkip} style={styles.devSkip} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  content: {
    marginTop: 32,
    gap: 16,
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
  avatarWrap: {
    alignItems: 'center',
    marginVertical: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F4F4F4',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#FAFAFA',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  continueButton: {
    marginTop: 16,
  },
  devSkip: {
    marginTop: 12,
    backgroundColor: '#0A84FF',
  },
});
