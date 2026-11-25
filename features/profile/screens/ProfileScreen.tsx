import React, { useState } from 'react';
import { Alert, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import {
  Bell,
  Camera,
  CaretRight,
  FileText,
  Headset,
  Motorcycle,
  SignOut,
  Star,
  User as UserIcon,
  Wallet,
  type Icon,
} from 'phosphor-react-native';
import { formatMinor } from '../../../lib/format/money';
import RateAppSheet from '../../settings/screens/RateAppSheet';
import { VEHICLES } from '../../../lib/vehicles';
import { useAuthStore } from '../../auth/store';
import { useEarnings } from '../../earnings/hooks';
import { useAreas, useProfile } from '../hooks';


interface MenuItem {
  key: string;
  label: string;
  Icon: Icon;
  color: string;
  value?: string;
  onPress: () => void;
}

export default function ProfileScreen() {
  const router = useRouter();
  const storedUser = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const profile = useProfile();
  const earnings = useEarnings();
  const areas = useAreas();
  const [rateAppOpen, setRateAppOpen] = useState(false);

  const rider = profile.data?.rider ?? storedUser;
  const totals = earnings.data;
  const fullName = `${rider?.firstName ?? ''} ${rider?.lastName ?? ''}`.trim() || 'Rider';
  const initial = fullName.charAt(0).toUpperCase();
  const rating = rider?.rating ?? totals?.rating ?? null;
  const areaName = areas.data?.areas.find((a) => a.id === rider?.areaId)?.name;
  const vehicleSummary = [rider?.vehicleType && VEHICLES[rider.vehicleType].label, rider?.plateNumber]
    .filter(Boolean)
    .join(' · ');

  const go = (href: Href) => () => router.push(href);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Account',
      items: [
        {
          key: 'personal',
          label: 'Personal Information',
          Icon: UserIcon,
          color: '#7E3AA8',
          onPress: go('/personal-info'),
        },
        {
          key: 'photo',
          label: 'Profile Photo',
          Icon: Camera,
          color: '#2F3FD8',
          onPress: go({ pathname: '/photo', params: { mode: 'edit' } }),
        },
        {
          key: 'vehicle',
          label: 'Vehicle & Service Area',
          Icon: Motorcycle,
          color: '#D93A35',
          value: areaName ?? vehicleSummary,
          onPress: go({ pathname: '/vehicle', params: { mode: 'edit' } }),
        },
        {
          key: 'wallet',
          label: 'Earnings & Wallet',
          Icon: Wallet,
          color: '#0085FF',
          value: `GHC ${formatMinor(rider?.walletBalance ?? 0)}`,
          onPress: go('/earnings'),
        },
      ],
    },
    {
      title: 'Help & Preferences',
      items: [
        { key: 'notif', label: 'Notification', Icon: Bell, color: '#E8912D', onPress: go('/notification-settings') },
        { key: 'help', label: 'Help & Support', Icon: Headset, color: '#3E9E4A', onPress: go('/support') },
        { key: 'rate', label: 'Rate GasApp', Icon: Star, color: '#E3B53A', onPress: () => setRateAppOpen(true) },
        { key: 'terms', label: 'Terms & Privacy', Icon: FileText, color: '#3A8A9A', onPress: go('/terms-privacy') },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={profile.isRefetching || earnings.isRefetching}
            onRefresh={() => {
              void profile.refetch();
              void earnings.refetch();
            }}
          />
        }
      >
        <TouchableOpacity
          style={styles.avatarWrap}
          onPress={go({ pathname: '/photo', params: { mode: 'edit' } })}
          accessibilityLabel="Change profile photo"
        >
          {rider?.photoUrl ? (
            <Image source={{ uri: rider.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}
          <View style={styles.cameraBadge}>
            <Camera size={14} color="#fff" weight="fill" />
          </View>
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.name}>{fullName}</Text>
            {!!rider?.phoneNumber && <Text style={styles.phone}>{rider.phoneNumber}</Text>}
            {!!vehicleSummary && <Text style={styles.vehicle}>{vehicleSummary}</Text>}
          </View>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Deliveries</Text>
              <Text style={styles.statValue}>{totals?.totalDeliveries ?? 0}</Text>
            </View>
            <View style={[styles.stat, styles.statMiddle]}>
              <Text style={styles.statLabel}>Total Earned</Text>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                GHC {formatMinor(totals?.totalEarned ?? 0)}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Rating</Text>
              <View style={styles.ratingRow}>
                {rating !== null && <Star size={16} color="#E3B53A" weight="fill" />}
                <Text style={styles.statValue}>{rating !== null ? rating.toFixed(1) : '—'}</Text>
              </View>
            </View>
          </View>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
            {section.items.map(({ key, label, Icon: ItemIcon, color, value, onPress }) => (
              <TouchableOpacity key={key} style={styles.row} onPress={onPress}>
                <View style={[styles.rowIcon, { backgroundColor: color }]}>
                  <ItemIcon size={16} color="#fff" weight="fill" />
                </View>
                <Text style={styles.rowLabel}>{label}</Text>
                {!!value && (
                  <Text style={styles.rowValue} numberOfLines={1}>
                    {value}
                  </Text>
                )}
                <CaretRight size={18} color="#000" />
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <TouchableOpacity style={styles.row} onPress={handleSignOut}>
          <View style={[styles.rowIcon, styles.signOutIcon]}>
            <SignOut size={16} color="#B42318" weight="bold" />
          </View>
          <Text style={[styles.rowLabel, styles.signOutText]}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>

      <RateAppSheet
        visible={rateAppOpen}
        onClose={() => setRateAppOpen(false)}
        onAddEmail={() => {
          setRateAppOpen(false);
          router.push('/personal-info');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.12)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 140,
  },
  avatarWrap: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
  },
  avatarFallback: {
    backgroundColor: '#316BF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
  },
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(80,80,200,0.15)',
    borderRadius: 24,
    backgroundColor: '#fff',
    shadowColor: '#5050C8',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardTop: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  phone: {
    fontSize: 15,
    color: 'rgba(0,0,0,0.5)',
    letterSpacing: 1,
  },
  vehicle: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.5)',
  },
  statsRow: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 6,
    gap: 8,
  },
  statMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.6)',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    color: 'rgba(0,0,0,0.45)',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  rowValue: {
    maxWidth: 120,
    fontSize: 13,
    color: 'rgba(0,0,0,0.45)',
  },
  signOutIcon: {
    backgroundColor: '#FEE4E2',
  },
  signOutText: {
    color: '#B42318',
    fontWeight: '600',
  },
});
