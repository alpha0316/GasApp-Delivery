import React, { useMemo } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, X } from 'phosphor-react-native';
import OrderRequestCard from '../../../components/OrderRequestCard';
import { errorMessage } from '../../../lib/api/client';
import { formatMinor } from '../../../lib/format/money';
import { useAuthStore } from '../../auth/store';
import { useActiveOrders, useRiderOrders, useStations } from '../../orders/hooks';
import { toOrderView, toRecentOrder } from '../../orders/mappers';
import { useProfile, useSetRiderStatus } from '../../profile/hooks';
import { useAcceptOrder, useDeclineOrder, usePool } from '../hooks';

const RECENT_LIMIT = 10;

export default function RiderHomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const profile = useProfile();
  const setStatus = useSetRiderStatus();
  const pool = usePool();
  const orders = useRiderOrders();
  const stations = useStations();
  const { orders: activeOrders } = useActiveOrders();
  const acceptOrder = useAcceptOrder();
  const declineOrder = useDeclineOrder();

  const rider = profile.data?.rider ?? user;
  const online = (rider?.riderStatus ?? 'offline') !== 'offline';

  const poolOrders = useMemo(
    () => (pool.data ?? []).map((order) => toOrderView(order, stations.data)),
    [pool.data, stations.data]
  );

  const recentOrders = useMemo(
    () =>
      (orders.data ?? [])
        .map((order) => toRecentOrder(order))
        .filter((order): order is NonNullable<typeof order> => order !== null)
        .slice(0, RECENT_LIMIT),
    [orders.data]
  );

  const handleToggleOnline = async (next: boolean) => {
    try {
      await setStatus.mutateAsync(next ? 'available' : 'offline');
    } catch (error) {
      Alert.alert('Error', errorMessage(error));
    }
  };

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
      Alert.alert('Error', errorMessage(error));
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
    <ScrollView style={styles.main} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        {rider?.photoUrl ? <Image source={{ uri: rider.photoUrl }} style={styles.avatar} /> : <View style={styles.avatar} />}
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Hello {rider?.firstName || 'Rider'} 👋</Text>
          <Text style={styles.subGreeting}>Todays Bookings</Text>
        </View>
      </View>

      <View style={styles.onlineRow}>
        <Text style={styles.onlineLabel}>{online ? 'Online' : 'Offline'}</Text>
        <Switch
          value={online}
          onValueChange={handleToggleOnline}
          disabled={setStatus.isPending}
          accessibilityLabel="Online status"
        />
      </View>

      {activeOrders.length > 0 && (
        <TouchableOpacity style={styles.continueButton} onPress={() => openTracking(activeOrders.map((o) => o.id))}>
          <Text style={styles.continueButtonText}>Continue delivery ({activeOrders.length})</Text>
        </TouchableOpacity>
      )}

      {online && pool.isError && <Text style={styles.poolMessage}>{errorMessage(pool.error)}</Text>}

      {poolOrders.length > 0 && (
        <View style={{ gap: 12 }}>
          <Text style={styles.sectionTitle}>New Order!</Text>
          {poolOrders.map((order) => (
            <OrderRequestCard
              key={order.id}
              order={order}
              onAccept={() => handleAccept(order.id)}
              onDecline={() => handleDecline(order.id)}
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
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 30,
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
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  onlineLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  continueButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
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
