import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { BellRinging, DeviceMobile, SpeakerHigh } from 'phosphor-react-native';
import BackButton from '../../../components/BackButton';
import { SectionLabel, ToggleRow } from '../components/SettingsRow';
import { useNotificationPrefs, type NotificationPrefs } from '../notificationSettings';
import { colors, rowColors } from '../theme';

// A ToggleRow bound to one stored preference.
function PrefRow(
  props: Omit<React.ComponentProps<typeof ToggleRow>, 'value' | 'onValueChange'> & { setting: keyof NotificationPrefs }
) {
  const { setting, ...row } = props;
  const value = useNotificationPrefs((s) => s[setting]);
  const set = useNotificationPrefs((s) => s.set);
  return <ToggleRow {...row} value={value} onValueChange={(v) => set({ [setting]: v })} />;
}

// What interrupts the rider. Opened from Profile -> Notification.
export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const load = useNotificationPrefs((s) => s.load);
  const phoneAlerts = useNotificationPrefs((s) => s.phoneAlerts);
  const [permission, setPermission] = useState<'granted' | 'ask' | 'blocked' | null>(null);

  const checkPermission = useCallback(async () => {
    const p = await Notifications.getPermissionsAsync();
    setPermission(p.granted ? 'granted' : p.canAskAgain ? 'ask' : 'blocked');
  }, []);

  useEffect(() => {
    void load();
    void checkPermission();
    // The rider may switch notifications on in Settings and come back.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkPermission();
    });
    return () => sub.remove();
  }, [load, checkPermission]);

  const allowNotifications = async () => {
    if (permission === 'ask') {
      await Notifications.requestPermissionsAsync();
      await checkPermission();
    } else {
      await Linking.openSettings();
    }
  };

  const phoneOff = permission !== null && permission !== 'granted';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <BackButton />
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <SectionLabel>Jobs</SectionLabel>
        <PrefRow
          icon={BellRinging}
          color={rowColors.notification}
          title="New job pop-ups"
          detail="Show a pop-up when a new job comes in while you're on a delivery."
          setting="jobBanners"
        />

        <SectionLabel>Phone notifications</SectionLabel>
        {phoneOff && (
          <View style={styles.permissionCard}>
            <Text style={styles.permissionTitle}>Notifications are off for GasApp</Text>
            <Text style={styles.permissionText}>Turn them on so you don&apos;t miss jobs when the app is closed.</Text>
            <TouchableOpacity style={styles.permissionButton} onPress={allowNotifications} accessibilityRole="button">
              <Text style={styles.permissionButtonText}>{permission === 'ask' ? 'Allow notifications' : 'Open Settings'}</Text>
            </TouchableOpacity>
          </View>
        )}
        <PrefRow
          icon={DeviceMobile}
          color={rowColors.privacy}
          title="Job alerts on your phone"
          detail="Show job alerts in Notification Center and on the lock screen."
          setting="phoneAlerts"
          disabled={phoneOff}
        />
        <PrefRow
          icon={SpeakerHigh}
          color="#12A150"
          title="Sound"
          detail="Play a sound with each phone alert."
          setting="sound"
          disabled={phoneOff || !phoneAlerts}
        />

        <Text style={styles.footnote}>Payout receipts and sign-in codes are always sent, whatever you choose here.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.hairline,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  body: { paddingHorizontal: 16, paddingTop: 8 },
  permissionCard: { padding: 14, borderRadius: 14, backgroundColor: colors.warningBg, marginVertical: 6, gap: 4 },
  permissionTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  permissionText: { fontSize: 13, color: 'rgba(0,0,0,0.6)' },
  permissionButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  permissionButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  footnote: { fontSize: 12, color: colors.textMuted, lineHeight: 17, marginTop: 24 },
});
