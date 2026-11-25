import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import PrimaryButton from '../../../components/PrimaryButton';
import BackButton from '../../../components/BackButton';
import TestBuildNote from '../../../components/dev/TestBuildNote';
import { errorMessage } from '../../../lib/api/client';
import { requestOtp } from '../api';

export default function PhoneNumberScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sending, setSending] = useState(false);

  const isButtonDisabled = phoneNumber.length < 10 || sending;

  const handleChangePhoneNumber = (text: string) => {
    setPhoneNumber(text.replace(/\D/g, '').slice(0, 10));
  };

  const handleRequestOtp = async () => {
    if (phoneNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number.');
      return;
    }
    setSending(true);
    try {
      await requestOtp(phoneNumber);
      router.push({ pathname: '/otp', params: { phoneNumber } });
    } catch (error) {
      Alert.alert('Error', errorMessage(error));
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <BackButton />
      </View>

      <View style={{ marginTop: 64, gap: 12 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 24, fontWeight: '700' }}>Welcome To The Rider App</Text>
          <Text style={{ fontSize: 16, color: 'rgba(0,0,0,0.6)' }}>Enter your phone number to start!</Text>
        </View>

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: phoneNumber ? '#000' : 'rgba(0, 0, 0, 0.20)',
              backgroundColor: phoneNumber ? '#fff' : '#F4F4F4',
            },
          ]}
          value={phoneNumber}
          onChangeText={handleChangePhoneNumber}
          keyboardType="numeric"
          autoCapitalize="none"
          placeholder="Enter your phone number"
          placeholderTextColor={'rgba(0,0,0,.5)'}
          returnKeyType="done"
          maxLength={10}
          accessibilityLabel="Phone Number"
        />
        <TestBuildNote text="Test build: enter any 10-digit number. No SMS is sent." />
        <PrimaryButton title="Sign In" disabled={isButtonDisabled} onPress={handleRequestOtp} />
        <View>
          <Text style={{ fontSize: 16, color: 'rgba(0,0,0,0.6)', textAlign: 'center' }}>
            An OTP code will be sent to your number for verification
          </Text>
        </View>
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
  label: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    height: 50,
    borderWidth: 1,
    padding: 8,
    borderRadius: 12,
  },
});
