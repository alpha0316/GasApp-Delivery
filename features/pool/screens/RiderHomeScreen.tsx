import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check, X } from 'phosphor-react-native';
import NewOrderRequestModal from '../../../components/NewOrderRequestModal';
import OngoingOrderCard from '../../../components/OngoingOrderCard';
import OrderRequestCard from '../../../components/OrderRequestCard';
import RiderStatusBanner from '../../../components/RiderStatusBanner';
import { errorMessage } from '../../../lib/api/client';
import { formatMinor } from '../../../lib/format/money';
import { orderAcceptErrorMessage } from '../../../lib/orders/errors';
import { useAuthStore } from '../../auth/store';
import { useActiveOrders, useRiderOrders, useStations } from '../../orders/hooks';
import { toOrderView, toRecentOrder } from '../../orders/mappers';
import { useProfile } from '../../profile/hooks';
import { useAcceptOrder, useDeclineOrder, usePool } from '../hooks';
import { useOfferWindows } from '../useOfferWindows';

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

  const rider = profile.data?.rider ?? user;
  const ongoingOrder = activeOrders.length > 0 ? activeOrders[0] : undefined;
  const ongoingView = ongoingOrder ? toOrderView(ongoingOrder, stations.data) : null;

  const poolOrders = useMemo(
    () => (pool.data ?? []).map((order) => toOrderView(order, stations.data)),
    [pool.data, stations.data]
  );
  const offerExpiresAt = useOfferWindows(poolOrders.map((order) => order.id));

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

  const openTracking = (orderIds: string[]) => {
    if (orderIds.length === 1) {
      router.push({ pathname: '/tracking', params: { orderId: orderIds[0] } });
    } else {
      router.push({ pathname: '/tracking', params: { orderIds: orderIds.join(',') } });
    }
  };

  const handleAccept = async (orderId: string) => {
    try {
      const { order } = await acceptOrder.mutateAsync(orderId);
      // A rider with a queue continues with it. The new order joins the queue.
      openTracking(activeOrders.length > 0 ? activeOrders.map((o) => o.id) : [order.id]);
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

        {ongoingView && (
          <View style={{ gap: 12 }}>
            <Text style={styles.sectionTitle}>On Going Order!</Text>
            <OngoingOrderCard order={ongoingView} onReturn={() => openTracking(activeOrders.map((o) => o.id))} />
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
        visible={!!offer && !offerDismissed}
        order={offer ?? null}
        offerExpiresAt={offer ? offerExpiresAt(offer.id) : new Date().toISOString()}
        onAccept={() => offer && handleAccept(offer.id)}
        onDecline={() => offer && handleDecline(offer.id)}
        onDismiss={() => setOfferDismissed(true)}
        busy={acceptOrder.isPending || declineOrder.isPending}
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
