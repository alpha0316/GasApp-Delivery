import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowDownIcon } from '../../../components/icons/OrderCardIcons';
import OrderQueueRow from '../../../components/OrderQueueRow';
import RiderStatusBanner from '../../../components/RiderStatusBanner';
import { errorMessage } from '../../../lib/api/client';
import { formatMinor } from '../../../lib/format/money';
import { useAuthStore } from '../../auth/store';
import { useActiveOrders } from '../../orders/hooks';
import { toQueueOrder } from '../../orders/mappers';
import { useProfile } from '../../profile/hooks';
import CapacityRequestModal from '../components/CapacityRequestModal';
import { useAcceptMany, usePool } from '../hooks';

// A batch is the rider's capacity: the pool orders in range, taken up to the
// free slots, join the active queue.
export default function BatchOrderHomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const profile = useProfile();
  const pool = usePool();
  const { orders: activeOrders } = useActiveOrders();
  const acceptMany = useAcceptMany();
  const [starting, setStarting] = useState(false);
  const [showCapacity, setShowCapacity] = useState(false);

  const rider = profile.data?.rider ?? user;
  const limit = profile.data?.maxConcurrentOrders ?? rider?.maxConcurrentOrders ?? 0;
  const activeCount = rider?.activeOrderCount ?? activeOrders.length;
  const freeSlots = Math.max(0, limit - activeCount);

  const zoneOrders = useMemo(
    () => (pool.data ?? []).map((order) => toQueueOrder(order, 'queued')),
    [pool.data]
  );
  const estimatedTotal = zoneOrders.reduce((sum, order) => sum + order.estimatedEarnings, 0);
  const canStart = zoneOrders.length > 0 ? freeSlots > 0 : activeOrders.length > 0;

  const handleStartDelivery = async () => {
    setStarting(true);
    try {
      const { accepted, failures } = await acceptMany.mutateAsync(zoneOrders.slice(0, freeSlots).map((o) => o.id));
      if (failures.length > 0) {
        Alert.alert('Some orders were not taken', failures.join('\n'));
      }
      const orderIds = [...activeOrders.map((o) => o.id), ...accepted];
      if (orderIds.length === 0) return;
      router.push({ pathname: '/tracking', params: { orderIds: orderIds.join(',') } });
    } finally {
      setStarting(false);
    }
  };

  return (
    <SafeAreaView style={styles.main} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <View style={styles.avatar} />
        <View>
          <Text style={styles.title}>Batch order available</Text>
          <Text style={styles.subtitle}>
            <Text style={styles.subtitleStrong}>{zoneOrders.length}</Text> orders in your zone · Est.{' '}
            <Text style={styles.subtitleAmount}>GH₵ {formatMinor(estimatedTotal)}</Text>
          </Text>
        </View>
        <TouchableOpacity style={styles.countBadge} onPress={() => setShowCapacity(true)}>
          <Text style={styles.countText}>
            {activeCount}
            <Text style={styles.countTextMuted}> / {limit}</Text>
          </Text>
        </TouchableOpacity>
      </View>

      <RiderStatusBanner rider={rider} />

      <View style={styles.queueSection}>
        <View style={styles.queueHeaderRow}>
          <Text style={styles.queueTitle}>Order Queue</Text>
          <TouchableOpacity style={styles.sortPill}>
            <Text style={styles.sortText}>
              Sort : <Text style={styles.sortTextStrong}>Closest</Text>
            </Text>
            <ArrowDownIcon />
          </TouchableOpacity>
        </View>

        {pool.isError && <Text style={styles.message}>{errorMessage(pool.error)}</Text>}

        <View style={styles.queueList}>
          {zoneOrders.map((order, index) => (
            <React.Fragment key={order.id}>
              <OrderQueueRow index={index + 1} order={order} variant="price" />
              {index < zoneOrders.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.startButton, (!canStart || starting) && styles.startButtonDisabled]}
          onPress={handleStartDelivery}
          disabled={!canStart || starting}
        >
          <Text style={styles.startButtonText}>Start Delivery</Text>
        </TouchableOpacity>
      </View>

      <CapacityRequestModal visible={showCapacity} currentLimit={limit} onClose={() => setShowCapacity(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingTop: 30,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 40,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D1D1D',
  },
  subtitle: {
    fontSize: 10,
    color: '#4F4F4F',
    marginTop: 4,
  },
  subtitleStrong: {
    fontWeight: '500',
    color: '#000',
  },
  subtitleAmount: {
    fontWeight: '600',
    color: '#34C759',
  },
  countBadge: {
    marginLeft: 'auto',
    backgroundColor: '#FAFAFA',
    borderRadius: 24,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  countTextMuted: {
    fontWeight: '400',
    color: 'rgba(0,0,0,0.6)',
  },
  queueSection: {
    marginTop: 36,
    gap: 12,
  },
  queueHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  queueTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 6,
    paddingVertical: 4,
    shadowColor: 'rgba(12,12,13,0.15)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  sortText: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.5)',
  },
  sortTextStrong: {
    color: '#000',
  },
  queueList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    gap: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  startButton: {
    backgroundColor: '#34C759',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 32,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(12,12,13,0.15)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  startButtonDisabled: {
    backgroundColor: '#A0A0A0',
  },
  message: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.5)',
  },
  startButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
