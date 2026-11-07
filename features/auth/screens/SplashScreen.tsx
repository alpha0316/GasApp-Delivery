import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuthStore } from '../store';

export default function SplashScreen() {
  const status = useAuthStore((s) => s.status);
  const bootstrapError = useAuthStore((s) => s.bootstrapError);
  const bootstrap = useAuthStore((s) => s.bootstrap);

  return (
    <View style={styles.container}>
      <View style={styles.logoRow}>
        <Text style={styles.text}>Gas</Text>
        <Text style={[styles.text, { color: 'rgba(0, 0, 0, 0.50)' }]}>App</Text>
      </View>
      {status === 'error' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{bootstrapError}</Text>
          <TouchableOpacity onPress={bootstrap}>
            <Text style={styles.retry}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRow: {
    flexDirection: 'row',
  },
  text: {
    fontWeight: '700',
    fontSize: 40,
  },
  errorBox: {
    marginTop: 24,
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  errorText: {
    color: 'rgba(0,0,0,0.6)',
    textAlign: 'center',
  },
  retry: {
    fontWeight: '700',
    color: '#000',
  },
});
