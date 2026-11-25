import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { VEHICLES } from '../../../lib/vehicles';
import { FormNote, FormRow, FormScreen, FormSection, PrimaryButton } from '../components/Form';
import { errorMessage, isValidEmail, saveNameAndEmail, useKitUser } from '../adapters';
import { colors } from '../theme';

// Name, phone, email and a summary of the vehicle. Opened from Profile.
//
// Unlike the customer app there's no code-verified "add contact" screen here yet, so the email
// is typed in directly and saved with the name. The phone number is the sign-in number and
// stays read-only.
export default function PersonalInfoScreen() {
  const router = useRouter();
  const user = useKitUser();
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [saving, setSaving] = useState(false);

  const emailChanged = email.trim() !== (user?.email ?? '');
  const emailInvalid = email.trim() !== '' && !isValidEmail(email);
  const unchanged =
    firstName.trim() === (user?.firstName ?? '') && lastName.trim() === (user?.lastName ?? '') && !emailChanged;
  const initial = (firstName.trim()[0] ?? user?.firstName?.[0] ?? 'R').toUpperCase();
  const vehicle = [user?.vehicleType && VEHICLES[user.vehicleType].label, user?.plateNumber].filter(Boolean).join(' · ');

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveNameAndEmail(firstName.trim(), lastName.trim(), emailChanged ? email.trim() : undefined);
      Alert.alert('Saved', 'Your details were updated.');
    } catch (error) {
      Alert.alert('Could not save your details', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen
      title="Personal Information"
      footer={
        <PrimaryButton
          title={saving ? 'Saving...' : 'Save'}
          disabled={saving || unchanged || firstName.trim() === '' || emailInvalid}
          onPress={handleSave}
        />
      }
    >
      {user?.photoUrl ? (
        <Image source={{ uri: user.photoUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
      )}

      <FormSection title="Basic info">
        <FormRow label="First name" value={firstName} onChangeText={setFirstName} maxLength={60} autoCapitalize="words" textContentType="givenName" />
        <FormRow label="Last name" value={lastName} onChangeText={setLastName} maxLength={60} autoCapitalize="words" textContentType="familyName" />
      </FormSection>

      <FormSection title="Contact">
        <FormRow label="Phone" value={user?.phoneNumber ?? ''} placeholder="Not set" readOnly />
        <FormRow
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="Add email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
        />
        {emailInvalid ? (
          <FormNote error>Enter a valid email address.</FormNote>
        ) : (
          <FormNote>Your phone number is how you sign in, so it can&apos;t be changed here. Support replies to your email.</FormNote>
        )}
      </FormSection>

      <FormSection title="Vehicle">
        <FormRow
          label="Vehicle"
          value={vehicle}
          placeholder="Add vehicle"
          onPress={() => router.push({ pathname: '/vehicle', params: { mode: 'edit' } })}
        />
      </FormSection>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  avatarText: { color: '#fff', fontSize: 34, fontWeight: '700' },
});
