import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import PrimaryButton from '../../../components/PrimaryButton';
import BackButton from '../../../components/BackButton';
import { errorMessage } from '../../../lib/api/client';
import { updateName } from '../api';
import { splitFullName } from '../names';
import { nextRoute } from '../nextRoute';
import { useAuthStore } from '../store';

export default function FullNameScreen() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);

  const isButtonDisabled = fullName.trim().length < 2 || saving;

  const handleContinue = async () => {
    const { firstName, lastName } = splitFullName(fullName);
    setSaving(true);
    try {
      const { user } = await updateName(firstName, lastName);
      setUser(user);
      router.replace(nextRoute(user));
    } catch (error) {
      Alert.alert('Error', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <BackButton />
      </View>

      <View style={styles.content}>
        <View style={styles.titleGroup}>
          <Text style={styles.title}>What&apos;s your name?</Text>
          <Text style={styles.subtitle}>This is how customers and stations will see you.</Text>
        </View>

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: fullName ? '#000' : 'rgba(0, 0, 0, 0.20)',
              backgroundColor: fullName ? '#fff' : '#F4F4F4',
            },
          ]}
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
          autoCorrect={false}
          placeholder="Enter your full name"
          placeholderTextColor="rgba(0,0,0,.5)"
          returnKeyType="done"
          accessibilityLabel="Full Name"
        />

        <PrimaryButton title="Continue" disabled={isButtonDisabled} onPress={handleContinue} />
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
    marginTop: 64,
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
});
