import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import PrimaryButton from '../../../components/PrimaryButton';
import BackButton from '../../../components/BackButton';
import { errorMessage } from '../../../lib/api/client';
import { requestOtp, verifyOtp } from '../api';
import { nextRoute } from '../nextRoute';
import { useAuthStore } from '../store';

const OTP_LENGTH = 6;

export default function OtpScreen() {
  const router = useRouter();
  const { phoneNumber = '' } = useLocalSearchParams<{ phoneNumber?: string }>();
  const signIn = useAuthStore((s) => s.signIn);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);

  const isButtonDisabled = otp.length < OTP_LENGTH || verifying;

  const handleChangeOtp = (text: string) => {
    setOtp(text.replace(/\D/g, '').slice(0, OTP_LENGTH));
  };

  const handleContinue = async () => {
    setVerifying(true);
    try {
      const { token, user } = await verifyOtp(phoneNumber, otp);
      if (user.role !== 'rider') {
        Alert.alert('Error', 'This phone number belongs to a non-rider account. Use another number.');
        return;
      }
      await signIn(token, user);
      router.replace(nextRoute(user));
    } catch (error) {
      Alert.alert('Error', errorMessage(error));
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      await requestOtp(phoneNumber);
      Alert.alert('OTP Resent', 'A new verification code has been sent to your phone.');
    } catch (error) {
      Alert.alert('Error', errorMessage(error));
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>OTP Verification</Text>
      </View>
      <Text style={styles.label}>Enter OTP Code</Text>
      <Text style={styles.subtitle}>Enter the verification code we just sent to your mobile number.</Text>

      <TextInput
        style={styles.input}
        value={otp}
        onChangeText={handleChangeOtp}
        maxLength={OTP_LENGTH}
        keyboardType="numeric"
        placeholderTextColor="rgba(0, 0, 0, 0.1)"
        accessibilityLabel="Enter OTP Code"
      />

      <PrimaryButton title="Verify" disabled={isButtonDisabled} onPress={handleContinue} />

      <View style={styles.resendContainer}>
        <Text style={styles.resendText}>Didn’t receive a code? </Text>
        <TouchableOpacity onPress={handleResendOTP}>
          <Text style={styles.resendLink}>Resend</Text>
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
  },
  label: {
    fontSize: 20,
    marginBottom: 8,
    marginTop: 50,
    fontWeight: '600',
  },
  subtitle: {
    marginBottom: 24,
    color: 'rgba(0, 0, 0, 0.60)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    paddingLeft: '20%',
  },
  input: {
    height: 50,
    borderColor: 'rgba(0, 0, 0, 0.20)',
    borderWidth: 1,
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    marginBottom: 16,
    width: '100%',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  resendText: {
    color: 'rgba(0, 0, 0, 0.60)',
    fontSize: 14,
  },
  resendLink: {
    fontWeight: '700',
    color: '#000',
  },
});
