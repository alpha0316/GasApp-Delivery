import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bank,
  CaretRight,
  ChatsCircle,
  DeviceMobile,
  FileText,
  GasCan,
  Headset,
  Motorcycle,
  PhoneCall,
  ShieldCheck,
  UserCircle,
  type Icon,
} from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionTile, LargeHeader } from '../components/HelpUI';
import { HELP_TOPICS, type TopicIcon } from '../content';
import { useSupportContact } from '../adapters';
import { colors } from '../theme';

export const TOPIC_ICONS: Record<TopicIcon, { Icon: Icon; color: string }> = {
  jobs: { Icon: Motorcycle, color: '#007AFF' },
  earnings: { Icon: Bank, color: '#0B8457' },
  safety: { Icon: ShieldCheck, color: '#2F3DE0' },
  cylinder: { Icon: GasCan, color: '#E5262A' },
  account: { Icon: UserCircle, color: '#8E2DA8' },
  app: { Icon: DeviceMobile, color: '#F08A00' },
};

// Help & Support: a white top card with the large title, then white rounded sheets on a grey
// page: help topics in a 2-column grid, then ways to reach a person.
export default function SupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { phone, whatsApp } = useSupportContact();
  const digits = (n: string) => n.replace(/[^\d]/g, '').replace(/^0/, '233');
  const callSupport = () => {
    if (!phone) {
      Alert.alert('Phone number unavailable', 'Please use “Contact a support agent” to reach customer service.');
      return;
    }
    void Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`).catch(() =>
      Alert.alert('Unable to call', 'Please try again or contact support by message.')
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        <View style={styles.topCard}>
          <LargeHeader title="Support" subtitle="What can we help with?" />
        </View>

        <View style={styles.sheet}>
          <Text style={styles.sectionTitle}>Browse help topics</Text>
          <View style={styles.grid}>
            {HELP_TOPICS.map((topic) => {
              const { Icon: Glyph, color } = TOPIC_ICONS[topic.icon];
              return (
                <TouchableOpacity
                  key={topic.id}
                  style={styles.topicTile}
                  onPress={() => router.push({ pathname: '/help-topic', params: { topicId: topic.id } })}
                  accessibilityRole="button"
                  activeOpacity={0.7}
                >
                  <Glyph size={22} weight="duotone" color={color} />
                  <View style={styles.topicRow}>
                    <Text style={styles.topicTitle}>{topic.title}</Text>
                    <CaretRight size={14} color="rgba(0,0,0,0.35)" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.sheet}>
          <Text style={styles.sectionTitle}>Something else</Text>
          <View style={styles.actions}>
            <ActionTile
              label="Contact a support agent"
              detail="We reply within 24 hours"
              icon={Headset}
              color={colors.support}
              onPress={() => router.push('/contact-support')}
            />
            <ActionTile
              label="Call a customer service agent"
              detail={phone ?? 'Call customer service'}
              icon={PhoneCall}
              color="#007AFF"
              onPress={callSupport}
            />
            {!!whatsApp && (
              <ActionTile
                label="Chat on WhatsApp"
                detail={whatsApp}
                icon={ChatsCircle}
                color="#25A244"
                onPress={() => Linking.openURL(`https://wa.me/${digits(whatsApp)}`)}
              />
            )}
            <ActionTile label="Terms & Privacy" icon={FileText} color="#6B7280" onPress={() => router.push('/terms-privacy')} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.backgroundGrouped },
  topCard: {
    backgroundColor: colors.background,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingBottom: 24,
  },
  sectionTitle: { fontSize: 21, fontWeight: '700', color: colors.heading },
  sheet: {
    backgroundColor: colors.background,
    borderRadius: 28,
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 16,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  topicTile: {
    width: '48.5%',
    minHeight: 96,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'space-between',
    gap: 12,
  },
  topicRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 },
  topicTitle: { flex: 1, fontSize: 16, fontWeight: '500', color: colors.heading },
  actions: { gap: 10 },
});
