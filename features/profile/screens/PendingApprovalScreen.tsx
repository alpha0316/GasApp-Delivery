import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import PrimaryButton from '../../../components/PrimaryButton';
import { errorMessage } from '../../../lib/api/client';
import { fetchMe } from '../../auth/api';
import { nextRoute } from '../../auth/nextRoute';
import { useAuthStore } from '../../auth/store';

export default function PendingApprovalScreen() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const signOut = useAuthStore((s) => s.signOut);
  const [checking, setChecking] = useState(false);

  const handleCheck = async () => {
    setChecking(true);
    try {
      const { user } = await fetchMe();
      setUser(user);
      const target = nextRoute(user);
      if (target === '/pending') {
        Alert.alert('Still waiting', 'An admin has not approved your account yet.');
        return;
      }
      router.replace(target);
    } catch (error) {
      Alert.alert('Error', errorMessage(error));
    } finally {
      setChecking(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.titleGroup}>
          <Text style={styles.title}>Waiting for approval</Text>
          <Text style={styles.subtitle}>
            An admin must approve your account before you can take orders.          </Text>
        </View>

        <PrimaryButton title={checking ? 'Checking...' : 'Check again'} disabled={checking} onPress={handleCheck} />

        <TouchableOpacity onPress={signOut} style={styles.signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white',
    justifyContent: 'center',
  },
  content: {
    gap: 16,
  },
  titleGroup: {
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(0,0,0,0.6)',
  },
  signOut: {
    alignItems: 'center',
    padding: 8,
  },
  signOutText: {
    fontWeight: '700',
    color: '#000',
  },
});
