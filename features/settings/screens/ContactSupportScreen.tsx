import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle } from 'phosphor-react-native';
import { FormNote, FormRow, FormScreen, FormSection, PrimaryButton } from '../components/Form';
import { errorMessage, isValidEmail, sendContactMessage, useKitUser } from '../adapters';
import { colors } from '../theme';

// Message a support agent. Lands on the admin dashboard's Messages page; the reply comes by
// email. Route params: { subject?: string } (set when opened from a help topic).
export default function ContactSupportScreen() {
  const router = useRouter();
  const { subject } = useLocalSearchParams<{ subject?: string }>();
  const user = useKitUser();
  const [name, setName] = useState(`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim());
  const [email, setEmail] = useState(user?.email ?? '');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const canSubmit = !!name.trim() && isValidEmail(email) && message.trim().length >= 5 && !sending;

  const handleSubmit = async () => {
    // The API wants a first and a last name; a single word is sent as the first name.
    const [firstName, ...rest] = name.trim().split(/\s+/);
    setSending(true);
    try {
      await sendContactMessage({
        firstName,
        lastName: rest.join(' ') || '-',
        email: email.trim(),
        // "RIDER" first, so the dashboard can tell riders and customers apart.
        message: [
          'RIDER',
          subject ? `Topic: ${subject}` : null,
          user?.phoneNumber ? `Phone: ${user.phoneNumber}` : null,
          '',
          message.trim(),
        ]
          .filter((l) => l !== null)
          .join('\n')
          .trim(),
      });
      setSent(true);
    } catch (error) {
      Alert.alert('Could not send your message', errorMessage(error));
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <FormScreen title="Contact support" footer={<PrimaryButton title="Done" onPress={() => router.back()} />}>
        <View style={styles.done}>
          <View style={styles.doneIcon}>
            <CheckCircle size={44} weight="fill" color={colors.success} />
          </View>
          <Text style={styles.doneTitle}>Message sent</Text>
          <Text style={styles.doneText}>Thanks for reaching out. Our team will reply to {email.trim()} within 24 hours.</Text>
        </View>
      </FormScreen>
    );
  }

  return (
    <FormScreen
      title="Contact support"
      footer={<PrimaryButton title={sending ? 'Sending…' : 'Send message'} onPress={handleSubmit} disabled={!canSubmit} />}
    >
      <FormSection title="Your details">
        <FormRow label="Name" value={name} onChangeText={setName} autoCapitalize="words" textContentType="name" />
        <FormRow
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
        />
        {!!subject && <FormRow label="Topic" value={subject} readOnly />}
      </FormSection>

      <FormSection title="How can we help?">
        <TextInput
          style={styles.message}
          value={message}
          onChangeText={setMessage}
          placeholder="Tell us what happened. Include the job date if it's about a delivery."
          placeholderTextColor="rgba(0,0,0,0.4)"
          multiline
          maxLength={2000}
          accessibilityLabel="Message"
        />
        <FormNote>We reply by email, usually within 24 hours.</FormNote>
      </FormSection>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  message: {
    marginHorizontal: 16,
    marginTop: 12,
    minHeight: 150,
    padding: 14,
    paddingTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  done: { alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingTop: 60 },
  doneIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  doneTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  doneText: { fontSize: 14, color: 'rgba(0,0,0,0.6)', textAlign: 'center', lineHeight: 20 },
});
