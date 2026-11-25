import React, { useEffect, useMemo, useState } from 'react';
import { showToast } from '../../../components/Toast';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check, X } from 'phosphor-react-native';
import NewOrderRequestModal from '../../../components/NewOrderRequestModal';
import OngoingOrderCard from '../../../components/OngoingOrderCard';
import OrderRequestCard from '../../../components/OrderRequestCard';
import RiderStatusBanner from '../../../components/RiderStatusBanner';
import { errorMessage } from '../../../lib/api/client';
import { formatMinor } from '../../../lib/format/money';
import { MIN_WALLET_BALANCE } from '../../../lib/pricing/feeSchedule';
import { orderAcceptErrorMessage } from '../../../lib/orders/errors';
import { useAuthStore } from '../../auth/store';
import { useActiveOrders, useRiderOrders, useStations } from '../../orders/hooks';
import { currentSingleOrder } from '../../orders/flow';
import { toOrderView, toRecentOrder } from '../../orders/mappers';
import { useProfile, useTopUpWallet } from '../../profile/hooks';
import { useAcceptOrder, useDeclineOrder, usePool } from '../hooks';
import { useOfferWindows } from '../useOfferWindows';
import { useNotificationPrefs } from '../../settings/notificationSettings';

const RECENT_LIMIT = 10;

export default function RiderHomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const profile = useProfile();
  const pool = usePool();
  const orders = useRiderOrders();
  const stations = useStations();
  const { orders: activeOrders } = useActiveOrders();
  const acceptOrder = useAcceptOrder();
  const declineOrder = useDeclineOrder();
  const topUpWallet = useTopUpWallet();

  const rider = profile.data?.rider ?? user;
  const walletAvailable = (rider?.walletBalance ?? 0) - (rider?.walletLocked ?? 0);
  const walletLow = walletAvailable < MIN_WALLET_BALANCE;
  const handleTopUp = () => {
    Alert.alert('Top up wallet', 'Add funds via Mobile Money to accept incoming orders.', [
      { text: 'GH₵20', onPress: () => topUpWallet.mutate(2000) },
      { text: 'GH₵50', onPress: () => topUpWallet.mutate(5000) },
      { text: 'GH₵100', onPress: () => topUpWallet.mutate(10000) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
  // One order at a time: the one under way; any others wait in the queue.
  const ongoingOrder = currentSingleOrder(activeOrders);
  const ongoingView = ongoingOrder ? toOrderView(ongoingOrder, stations.data) : null;

  const poolOrders = useMemo(
    () => (pool.data ?? []).map((order) => toOrderView(order, stations.data)),
    [pool.data, stations.data]
  );
  const offerExpiresAt = useOfferWindows(poolOrders.map((order) => order.id));
  // Profile -> Notification can turn off job pop-ups while on a delivery.
  const jobPopups = useNotificationPrefs((s) => s.jobBanners);

  // While there's an ongoing delivery, a new pool order interrupts with a
  // popup instead of sitting inline - the rider is already busy with one.
  const offer = ongoingOrder ? poolOrders[0] : undefined;
  // Closing the popup just hides it; a fresh offer (different id) always
  // starts shown again.
  const [offerDismissed, setOfferDismissed] = useState(false);
  useEffect(() => setOfferDismissed(false), [offer?.id]);

  const recentOrders = useMemo(
    () =>
      (orders.data ?? [])
        .map((order) => toRecentOrder(order))
        .filter((order): order is NonNullable<typeof order> => order !== null)
        .slice(0, RECENT_LIMIT),
    [orders.data]
  );

  const openTracking = (orderId: string) => {
    router.push({ pathname: '/tracking', params: { orderId } });
  };

  const handleAccept = async (orderId: string) => {
    if (walletLow) {
      handleTopUp();
      return;
    }
    try {
      const { order } = await acceptOrder.mutateAsync(orderId);
      // Already on a ride: the new order waits in the queue and starts after it.
      if (ongoingOrder) {
        showToast('Added to your queue', { tone: 'success', message: 'It starts when this delivery is done' });
        return;
      }
      openTracking(order.id);
    } catch (error) {
      Alert.alert('Error', orderAcceptErrorMessage(error));
    }
  };

  const handleDecline = async (orderId: string) => {
    try {
      await declineOrder.mutateAsync(orderId);
    } catch (error) {
      Alert.alert('Error', errorMessage(error));
    }
  };

  return (
    <SafeAreaView style={styles.main} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          {rider?.photoUrl ? <Image source={{ uri: rider.photoUrl }} style={styles.avatar} /> : <View style={styles.avatar} />}
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Hello {rider?.firstName || 'Rider'} 👋</Text>
            <Text style={styles.subGreeting}>Todays Bookings</Text>
          </View>
        </View>

        <RiderStatusBanner rider={rider} />

        {walletLow && poolOrders.length > 0 && (
          <View style={styles.walletPrompt}>
            <View style={styles.walletPromptCopy}>
              <Text style={styles.walletPromptTitle}>Top up to accept orders</Text>
              <Text style={styles.walletPromptText}>
                Your available wallet balance is ₵ {formatMinor(walletAvailable)}. Add funds to reach the ₵ {formatMinor(MIN_WALLET_BALANCE)} minimum.
              </Text>
            </View>
            <TouchableOpacity style={styles.walletPromptButton} onPress={handleTopUp} disabled={topUpWallet.isPending}>
              <Text style={styles.walletPromptButtonText}>{topUpWallet.isPending ? 'Adding...' : 'Top up wallet'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {ongoingView && (
          <View style={{ gap: 12 }}>
            <Text style={styles.sectionTitle}>On Going Order!</Text>
            <OngoingOrderCard order={ongoingView} onReturn={() => openTracking(ongoingView.id)} />
          </View>
        )}

        {pool.isError && <Text style={styles.poolMessage}>{errorMessage(pool.error)}</Text>}

        {!ongoingView && poolOrders.length > 0 && (
          <View style={{ gap: 12 }}>
            <Text style={styles.sectionTitle}>New Order!</Text>
            {poolOrders.map((order) => (
              <OrderRequestCard
                key={order.id}
                order={order}
                offerExpiresAt={offerExpiresAt(order.id)}
                acceptDisabled={walletLow}
                onAccept={() => handleAccept(order.id)}
                onDecline={() => handleDecline(order.id)}
                busy={acceptOrder.isPending || declineOrder.isPending}
              />
            ))}
          </View>
        )}

        <View style={{ gap: 12 }}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          {recentOrders.map((order) => (
            <View key={order.id} style={styles.recentRow}>
              <View
                style={[
                  styles.statusIcon,
                  order.status === 'completed' ? styles.statusIconSuccess : styles.statusIconCancel,
                ]}
              >
                {order.status === 'completed' ? (
                  <Check size={14} color="#fff" weight="bold" />
                ) : (
                  <X size={14} color="#fff" weight="bold" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.recentName}>{order.customerName}</Text>
                <Text style={styles.recentMeta}>{order.area}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.recentAmount}>₵ {formatMinor(order.amount)}</Text>
                <Text style={styles.recentTime}>{order.time}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <NewOrderRequestModal
        visible={!!offer && !offerDismissed && jobPopups}
        order={offer ?? null}
        offerExpiresAt={offer ? offerExpiresAt(offer.id) : new Date().toISOString()}
        onAccept={() => offer && handleAccept(offer.id)}
        onDecline={() => offer && handleDecline(offer.id)}
        onDismiss={() => setOfferDismissed(true)}
        busy={acceptOrder.isPending || declineOrder.isPending}
        acceptDisabled={walletLow}
        onTopUp={handleTopUp}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
    gap: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5f5f5',
  },
  greeting: {
    fontSize: 16,
    fontWeight: '700',
  },
  subGreeting: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.5)',
    marginTop: 2,
  },
  poolMessage: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.5)',
  },
  walletPrompt: {
    backgroundColor: '#FFF7E6',
    borderColor: '#F2D59B',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  walletPromptCopy: { gap: 4 },
  walletPromptTitle: { fontSize: 15, fontWeight: '700', color: '#5C3B00' },
  walletPromptText: { fontSize: 13, lineHeight: 18, color: '#755313' },
  walletPromptButton: { backgroundColor: '#111827', borderRadius: 24, paddingVertical: 11, alignItems: 'center' },
  walletPromptButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconSuccess: {
    backgroundColor: '#22C55E',
  },
  statusIconCancel: {
    backgroundColor: '#EF4444',
  },
  recentName: {
    fontSize: 14,
    fontWeight: '600',
  },
  recentMeta: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.5)',
    marginTop: 2,
  },
  recentAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  recentTime: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.5)',
    marginTop: 2,
  },
});
