import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { User, Camera, Image as ImageIcon } from 'phosphor-react-native';
import PrimaryButton from '../../components/PrimaryButton';
import BackButton from '../../components/BackButton';

export default function ProfilePhoto({ navigation, route }) {
  const { phoneNumber, fullName } = route?.params ?? {};
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isButtonDisabled = !photoUri || saving;

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
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleChooseFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo library access to choose a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleContinue = async () => {
    if (!photoUri) return;
    setSaving(true);
    try {
      await SecureStore.setItemAsync('riderFullName', fullName ?? '');
      await SecureStore.setItemAsync('riderPhotoUri', photoUri);
      await SecureStore.setItemAsync('riderPhoneNumber', phoneNumber ?? '');
    } finally {
      setSaving(false);
    }
    navigation.reset({ index: 0, routes: [{ name: 'RiderHome' }] });
  };

  return (
    <View style={styles.container}>
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
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImage} />
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
      </View>
    </View>
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
});
