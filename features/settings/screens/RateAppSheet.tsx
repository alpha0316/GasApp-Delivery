import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, Linking, Platform } from 'react-native';
import { CheckCircle } from 'phosphor-react-native';
import FloatingSheet, { SheetButton } from '../../../components/FloatingSheet';
import { RatingFields, RatingHeader, ratingStyles, useRatingForm, type RatingBands } from '../components/RatingFields';
import { errorMessage, sendContactMessage, useKitUser } from '../adapters';
import { colors } from '../theme';

// TODO: confirm the rider app's Play Store package id. Android only: iOS needs the App Store
// id once it's listed.
const PLAY_STORE_URL = 'market://details?id=com.gasapp.rider';

// Tags offered for each score. Rider-flavoured suggestions; edit with the product team.
export const RIDER_APP_RATING_BANDS: RatingBands = {
  1: { label: 'Very bad', tags: ['App crashes', 'Hard to use', 'Wrong directions', 'Payout problems', 'Poor support'] },
  2: { label: 'Poor', tags: ['Slow', 'Too few jobs', 'Wrong directions', 'Confusing earnings', 'Battery drain'] },
  3: { label: 'Satisfied', tags: ['Easy to use', 'Clear earnings', 'Good navigation', 'More jobs', 'Faster payouts'] },
  4: { label: 'Good', tags: ['Easy to use', 'Clear earnings', 'Good navigation', 'Steady jobs', 'Helpful alerts'] },
  5: { label: 'Excellent', tags: ['Easy to use', 'Clear earnings', 'Good navigation', 'Steady jobs', 'Fast payouts', 'Great support'] },
};

// "Rate GasApp" from Profile, on the floating sheet. Happy riders are then invited to leave a
// store review. `onAddEmail` opens Personal Information (feedback needs a reply address).
export default function RateAppSheet({
  visible,
  onClose,
  onAddEmail,
}: {
  visible: boolean;
  onClose: () => void;
  onAddEmail: () => void;
}) {
  const user = useKitUser();
  const form = useRatingForm(RIDER_APP_RATING_BANDS);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  // Start fresh each time it opens.
  const { reset } = form;
  useEffect(() => {
    if (visible) {
      reset();
      setSent(false);
    }
    // reset is recreated each render; only re-run when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const submit = async () => {
    if (!form.band || !user) return;
    if (!user.email) {
      Alert.alert('Add an email first', 'We need an email address so we can follow up on your feedback.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add email', onPress: onAddEmail },
      ]);
      return;
    }
    setBusy(true);
    try {
      // No app-rating endpoint: the rating goes to the dashboard's Messages page.
      await sendContactMessage({
        firstName: user.firstName || 'GasApp',
        lastName: user.lastName || 'rider',
        email: user.email,
        message: [
          'RIDER APP RATING',
          `Score: ${form.score}/5 (${form.band.label})`,
          form.tags.length ? `Tags: ${form.tags.join(', ')}` : null,
          form.comment.trim() ? `Comment: ${form.comment.trim()}` : null,
          '',
          `User ID: ${user.id}`,
          `Phone: ${user.phoneNumber ?? 'none'}`,
        ]
          .filter((l) => l !== null)
          .join('\n'),
      });
      setSent(true);
    } catch (error) {
      Alert.alert('Could not send your rating', errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const askForReview = sent && form.score >= 4 && Platform.OS === 'android';

  const footer = !sent ? (
    <SheetButton title={busy ? 'Sending…' : 'Submit'} disabled={!form.score || busy} onPress={submit} />
  ) : askForReview ? (
    <>
      <SheetButton title="Not now" variant="secondary" onPress={onClose} />
      <SheetButton
        title="Rate on Google Play"
        onPress={() => {
          onClose();
          Linking.openURL(PLAY_STORE_URL).catch(() => {});
        }}
      />
    </>
  ) : (
    <SheetButton title="Done" onPress={onClose} />
  );

  return (
    <FloatingSheet visible={visible} onClose={busy ? () => {} : onClose} footer={footer} contentStyle={ratingStyles.content}>
      {!sent ? (
        <>
          <RatingHeader title="Rate GasApp" onClose={onClose} />
          <Text style={styles.subtitle}>How has GasApp been for you so far?</Text>
          <RatingFields form={form} placeholder="What should we improve?" />
        </>
      ) : (
        <View style={styles.done}>
          <View style={styles.doneIcon}>
            <CheckCircle size={40} weight="fill" color={colors.success} />
          </View>
          <Text style={styles.doneTitle}>Thanks for your feedback!</Text>
          <Text style={styles.doneText}>
            {askForReview
              ? 'Glad you like GasApp. Would you share a quick review on Google Play? It helps others find us.'
              : 'Our team reads every rating and uses it to make GasApp better.'}
          </Text>
        </View>
      )}
    </FloatingSheet>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: -8 },
  done: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  doneIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  doneText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
});
