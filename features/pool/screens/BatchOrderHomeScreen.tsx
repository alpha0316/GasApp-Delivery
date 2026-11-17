import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import ActiveQueueOrderCard from '../../../components/ActiveQueueOrderCard';
import CancelOrderModal from '../../../components/CancelOrderModal';
import NewOrderRequestModal from '../../../components/NewOrderRequestModal';
import OngoingOrderCard from '../../../components/OngoingOrderCard';
import { ArrowDownIcon } from '../../../components/icons/OrderCardIcons';
import OrderQueueRow from '../../../components/OrderQueueRow';
import RiderStatusBanner from '../../../components/RiderStatusBanner';
import { errorMessage } from '../../../lib/api/client';
import { formatMinor } from '../../../lib/format/money';
import type { CancelReason } from '../../../lib/orders/cancelReasons';
import { orderAcceptErrorMessage } from '../../../lib/orders/errors';
import { distanceMeters } from '../../../utils/geo';
import { useAuthStore } from '../../auth/store';
import { deriveBatch } from '../../delivery/batch';
import { useLocationStore } from '../../location/store';
import { useActiveOrders, useCancelOrder, useFlaggedIds, useStations } from '../../orders/hooks';
import { toOrderView, toQueueOrder } from '../../orders/mappers';
import { useProfile } from '../../profile/hooks';
import CapacityRequestModal from '../components/CapacityRequestModal';
import { useAcceptMany, useAcceptOrder, useDeclineOrder, usePool } from '../hooks';
import { useOfferWindows } from '../useOfferWindows';

// A batch is the rider's capacity: the pool orders in range, taken up to the
// free slots, join the active queue.
export default function BatchOrderHomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const profile = useProfile();
  const pool = usePool();
  const stations = useStations();
  const { orders: activeOrders } = useActiveOrders();
  const flaggedIds = useFlaggedIds();
  const position = useLocationStore((s) => s.position);
  const acceptMany = useAcceptMany();
  const acceptOffer = useAcceptOrder();
  const declineOffer = useDeclineOrder();
  const cancelOrder = useCancelOrder();
  const [starting, setStarting] = useState(false);
  const [showCapacity, setShowCapacity] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [queueSort, setQueueSort] = useState<'distance' | 'time'>('distance');

  const rider = profile.data?.rider ?? user;
  const limit = profile.data?.maxConcurrentOrders ?? rider?.maxConcurrentOrders ?? 0;
  const activeCount = rider?.activeOrderCount ?? activeOrders.length;
  const freeSlots = Math.max(0, limit - activeCount);

  const activeBatch = useMemo(
    () => deriveBatch(activeOrders, flaggedIds, stations.data),
    [activeOrders, flaggedIds, stations.data]
  );
  const current = activeBatch.upNext ?? activeBatch.remaining[0];
  const currentView = current ? toOrderView(current, stations.data) : null;
  const restOfQueue = activeBatch.queue.filter((o) => o.id !== current?.id);

  const zoneOrders = useMemo(
    () => (pool.data ?? []).map((order) => toQueueOrder(order, 'queued')),
    [pool.data]
  );
  const estimatedTotal = zoneOrders.reduce((sum, order) => sum + order.estimatedEarnings, 0);
  const canStart = zoneOrders.length > 0 ? freeSlots > 0 : activeOrders.length > 0;

  // While there's an active batch, a new pool order interrupts with a popup
  // instead of sitting inline in the zone list below.
  const offer = current ? pool.data?.[0] : undefined;
  const offerView = offer ? toOrderView(offer, stations.data) : null;
  const offerExpiresAt = useOfferWindows(offer ? [offer.id] : []);
  // Closing the popup just hides it; a fresh offer (different id) always
  // starts shown again.
  const [offerDismissed, setOfferDismissed] = useState(false);
  useEffect(() => setOfferDismissed(false), [offer?.id]);

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

  const handleAcceptOffer = async () => {
    if (!offer) return;
    try {
      await acceptOffer.mutateAsync(offer.id);
    } catch (error) {
      Alert.alert('Error', orderAcceptErrorMessage(error));
    }
  };

  const handleDeclineOffer = async () => {
    if (!offer) return;
    try {
      await declineOffer.mutateAsync(offer.id);
    } catch (error) {
      Alert.alert('Error', errorMessage(error));
    }
  };

  const handleCancelOrder = (reason: CancelReason) => {
    const targetId = cancelTargetId;
    if (!targetId) return;
    setCancelTargetId(null);
    void cancelOrder.mutateAsync({ orderId: targetId, reason }).catch((error) => Alert.alert('Error', errorMessage(error)));
  };

  const sortedQueue = restOfQueue
    .map((o) => ({ order: o, distanceKm: position ? distanceMeters(position, o.customerLocation) / 1000 : null }))
    .sort((a, b) => {
      if (queueSort === 'time') return new Date(a.order.createdAt).getTime() - new Date(b.order.createdAt).getTime();
      if (a.distanceKm === null || b.distanceKm === null) return 0;
      return a.distanceKm - b.distanceKm;
    });

  const handleViewOrder = (orderId: string) => {
    const order = activeOrders.find((o) => o.id === orderId);
    if (!order) return;
    const view = toOrderView(order, stations.data);
    Alert.alert(
      `${view.customerName}'s order`,
      `Filling station: ${view.fillingStationName || '—'}\nDeliver to: ${view.dropoffAddress}\n${view.cylinderSize} size · ₵ ${formatMinor(view.amount)}`
    );
  };

  return (
    <SafeAreaView style={styles.main} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <View style={styles.avatar} />
        <View>
          <Text style={styles.title}>{current ? 'On Going Order!' : 'Batch order available'}</Text>
          {!current && (
            <Text style={styles.subtitle}>
              <Text style={styles.subtitleStrong}>{zoneOrders.length}</Text> orders in your zone · Est.{' '}
              <Text style={styles.subtitleAmount}>GH₵ {formatMinor(estimatedTotal)}</Text>
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.countBadge} onPress={() => setShowCapacity(true)}>
          <Text style={styles.countText}>
            {activeCount}
            <Text style={styles.countTextMuted}> / {limit}</Text>
          </Text>
        </TouchableOpacity>
      </View>

      <RiderStatusBanner rider={rider} />

      {currentView ? (
        <View style={styles.queueSection}>
          <OngoingOrderCard
            order={currentView}
            onReturn={() => router.push({ pathname: '/tracking', params: { orderIds: activeOrders.map((o) => o.id).join(',') } })}
          />

          {sortedQueue.length > 0 && (
            <>
              <View style={styles.queueHeaderRow}>
                <Text style={styles.queueTitle}>Orders Queue</Text>
                <View style={styles.sortTabs}>
                  <TouchableOpacity
                    style={[styles.sortTab, queueSort === 'distance' && styles.sortTabActive]}
                    onPress={() => setQueueSort('distance')}
                  >
                    <Text style={[styles.sortTabText, queueSort === 'distance' && styles.sortTabTextActive]}>📍 Nearest</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sortTab, queueSort === 'time' && styles.sortTabActive]}
                    onPress={() => setQueueSort('time')}
                  >
                    <Text style={[styles.sortTabText, queueSort === 'time' && styles.sortTabTextActive]}>🕐 Oldest</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {sortedQueue.map(({ order: o, distanceKm }, index) => (
                <ActiveQueueOrderCard
                  key={o.id}
                  index={index + 1}
                  order={o}
                  distanceKm={distanceKm}
                  canRefer={activeOrders.find((ao) => ao.id === o.id)?.status === 'rider_assigned'}
                  onRefer={() => setCancelTargetId(o.id)}
                  onViewOrder={() => handleViewOrder(o.id)}
                />
              ))}
            </>
          )}
        </View>
      ) : (
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
      )}

      <CapacityRequestModal visible={showCapacity} currentLimit={limit} onClose={() => setShowCapacity(false)} />

      <CancelOrderModal visible={!!cancelTargetId} onCancel={() => setCancelTargetId(null)} onSubmit={handleCancelOrder} />

      <NewOrderRequestModal
        visible={!!offerView && !offerDismissed}
        order={offerView}
        offerExpiresAt={offer ? offerExpiresAt(offer.id) : new Date().toISOString()}
        onAccept={handleAcceptOffer}
        onDecline={handleDeclineOffer}
        onDismiss={() => setOfferDismissed(true)}
        busy={acceptOffer.isPending || declineOffer.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingTop: 16,
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
    marginTop: 24,
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
  sortTabs: {
    flexDirection: 'row',
    backgroundColor: '#F4F4F4',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  sortTab: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  sortTabActive: {
    backgroundColor: '#34C759',
  },
  sortTabText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(0,0,0,0.5)',
  },
  sortTabTextActive: {
    color: '#fff',
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
