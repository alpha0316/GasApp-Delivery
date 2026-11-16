import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Coins, Star, Truck, Wallet } from 'phosphor-react-native';
import OrderHistoryRow from '../../../components/OrderHistoryRow';
import SegmentedTabs from '../../../components/SegmentedTabs';
import { errorMessage } from '../../../lib/api/client';
import { formatMinor } from '../../../lib/format/money';
import { LOW_WALLET_BALANCE_ALERT, MIN_WALLET_BALANCE } from '../../../lib/pricing/feeSchedule';
import { useAuthStore } from '../../auth/store';
import { isActiveStatus } from '../../orders/flow';
import { useRiderOrders, useStations } from '../../orders/hooks';
import { toOrderView } from '../../orders/mappers';
import { useEarnings } from '../hooks';
import { useProfile, useTopUpWallet } from '../../profile/hooks';

type EarningsTab = 'overview' | 'orders';

const TABS: { value: EarningsTab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'orders', label: 'Orders' },
];

export default function EarningsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<EarningsTab>('overview');
  const earnings = useEarnings();
  const orders = useRiderOrders();
  const stations = useStations();
  const profile = useProfile();
  const user = useAuthStore((s) => s.user);
  const topUpWallet = useTopUpWallet();
  const totals = earnings.data;

  const rider = profile.data?.rider ?? user;
  const walletBalance = rider?.walletBalance ?? 0;
  const walletLocked = rider?.walletLocked ?? 0;
  const walletAvailable = walletBalance - walletLocked;

  const handleTopUp = () => {
    Alert.alert('Top up wallet', 'Choose an amount to add via Mobile Money.', [
      { text: 'GH₵20', onPress: () => topUpWallet.mutate(2000) },
      { text: 'GH₵50', onPress: () => topUpWallet.mutate(5000) },
      { text: 'GH₵100', onPress: () => topUpWallet.mutate(10000) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const orderRows = useMemo(
    () => (orders.data ?? []).map((order) => ({ raw: order, view: toOrderView(order, stations.data) })),
    [orders.data, stations.data]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={earnings.isRefetching} onRefresh={earnings.refetch} />}
      >
        <Text style={styles.title}>Earnings</Text>

        <SegmentedTabs options={TABS} value={tab} onChange={setTab} />

        {tab === 'overview' ? (
          <>
            {earnings.isLoading && <ActivityIndicator style={{ marginTop: 32 }} />}
            {earnings.isError && <Text style={styles.errorText}>{errorMessage(earnings.error)}</Text>}

            {totals && (
              <>
                <View style={styles.heroCard}>
                  <Wallet size={22} color="#fff" weight="fill" />
                  <Text style={styles.heroLabel}>Total earned</Text>
                  <Text style={styles.heroAmount}>
                    ₵ {formatMinor(totals.totalEarned)} {totals.currency !== 'GHS' ? totals.currency : ''}
                  </Text>
                </View>

                <View style={styles.walletCard}>
                  <View style={styles.walletHeaderRow}>
                    <Text style={styles.walletTitle}>Wallet</Text>
                    <TouchableOpacity style={styles.topUpButton} onPress={handleTopUp} disabled={topUpWallet.isPending}>
                      <Text style={styles.topUpButtonText}>{topUpWallet.isPending ? 'Adding...' : 'Top up'}</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.walletAmount}>₵ {formatMinor(walletAvailable)} available</Text>
                  {walletLocked > 0 && (
                    <Text style={styles.walletMeta}>₵ {formatMinor(walletLocked)} locked for cash orders in progress</Text>
                  )}
                  {walletAvailable < LOW_WALLET_BALANCE_ALERT && (
                    <Text style={styles.walletWarning}>
                      Low balance. Top up to keep accepting cash orders.
                    </Text>
                  )}
                  {walletAvailable < MIN_WALLET_BALANCE && (
                    <Text style={styles.walletMeta}>
                      Minimum of ₵ {formatMinor(MIN_WALLET_BALANCE)} recommended to stay eligible for cash orders.
                    </Text>
                  )}
                </View>

                <View style={styles.row}>
                  <View style={styles.statCard}>
                    <Coins size={18} color="#000" weight="bold" />
                    <Text style={styles.statLabel}>Pending payout</Text>
                    <Text style={styles.statValue}>₵ {formatMinor(totals.payoutPending)}</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Coins size={18} color="#000" weight="bold" />
                    <Text style={styles.statLabel}>Paid out</Text>
                    <Text style={styles.statValue}>₵ {formatMinor(totals.payoutPaid)}</Text>
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.statCard}>
                    <Wallet size={18} color="#000" weight="bold" />
                    <Text style={styles.statLabel}>Cash collected</Text>
                    <Text style={styles.statValue}>₵ {formatMinor(totals.cashCollected)}</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Star size={18} color="#000" weight="fill" />
                    <Text style={styles.statLabel}>Rating</Text>
                    <Text style={styles.statValue}>{totals.rating !== null ? totals.rating.toFixed(1) : '—'}</Text>
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.statCard}>
                    <Truck size={18} color="#000" weight="bold" />
                    <Text style={styles.statLabel}>Today&apos;s deliveries</Text>
                    <Text style={styles.statValue}>{totals.todayDeliveries}</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Truck size={18} color="#000" weight="bold" />
                    <Text style={styles.statLabel}>Total deliveries</Text>
                    <Text style={styles.statValue}>{totals.totalDeliveries}</Text>
                  </View>
                </View>
              </>
            )}
          </>
        ) : (
          <View>
            {orders.isLoading && <ActivityIndicator style={{ marginTop: 32 }} />}
            {orders.isError && <Text style={styles.errorText}>{errorMessage(orders.error)}</Text>}
            {!orders.isLoading && orderRows.length === 0 && <Text style={styles.emptyText}>No orders yet.</Text>}
            {orderRows.map(({ raw, view }) => (
              <OrderHistoryRow
                key={raw.id}
                order={view}
                onPress={
                  isActiveStatus(raw.status)
                    ? () => router.push({ pathname: '/tracking', params: { orderId: raw.id } })
                    : undefined
                }
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  errorText: {
    color: '#B42318',
    fontSize: 13,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.5)',
    textAlign: 'center',
    marginTop: 24,
  },
  heroCard: {
    backgroundColor: '#000',
    borderRadius: 24,
    padding: 20,
    gap: 6,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  heroAmount: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
  },
  walletCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#FAFAFA',
    padding: 16,
    gap: 4,
  },
  walletHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  topUpButton: {
    backgroundColor: '#000',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  topUpButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  walletAmount: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  walletMeta: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.5)',
  },
  walletWarning: {
    fontSize: 12,
    color: '#B42318',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#FAFAFA',
    padding: 16,
    gap: 6,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.5)',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
});
