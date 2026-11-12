import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import BackButton from '../../../components/BackButton';
import TrackingOrderCard from '../../../components/TrackingOrderCard';
import NewOrderRequestModal from '../../../components/NewOrderRequestModal';
import DeliveryCompleteModal from '../../../components/DeliveryCompleteModal';
import OrderQueueRow from '../../../components/OrderQueueRow';
import ReportOrderIssueModal from '../../../components/ReportOrderIssueModal';
import { WarningIcon } from '../../../components/icons/OrderCardIcons';
import { errorMessage } from '../../../lib/api/client';
import { formatMinor } from '../../../lib/format/money';
import type { ApiOrder } from '../../../lib/api/types';
import { DeliveryStage, LatLng, OrderIssueReason } from '../../../types/order';
import { useEarnings } from '../../earnings/hooks';
import { useLocationStore } from '../../location/store';
import {
  useActiveOrders,
  useAdvanceOrder,
  useCompleteDelivery,
  useFlaggedIds,
  useReportIssue,
  useRiderOrders,
  useStations,
} from '../../orders/hooks';
import { phaseOf, type Phase } from '../../orders/flow';
import { customerLatLng, stationLatLng, toOrderView } from '../../orders/mappers';
import { useAcceptOrder, useDeclineOrder, usePool } from '../../pool/hooks';
import { deriveBatch } from '../batch';
import TrackingMap from '../TrackingMap';
import { useLegProgress, useRoutePath } from '../hooks';

// How long the bike takes to glide to a new GPS fix.
const PHASE_CONFIG: Record<
  Phase,
  { headerTitle: string; steps: DeliveryStage[]; stage: DeliveryStage; showContactRow: boolean; buttonLabel: string }
> = {
  toUserPickup: {
    headerTitle: 'Heading to User Location',
    steps: ['arrived', 'filling', 'completed'],
    stage: 'arrived',
    showContactRow: true,
    buttonLabel: 'Picked Up Cylinder',
  },
  toStation: {
    headerTitle: 'Heading to filling station',
    steps: ['arrived', 'filling', 'completed'],
    stage: 'filling',
    showContactRow: false,
    buttonLabel: 'Filled Up, Heading to Customer',
  },
  toUserDropoff: {
    headerTitle: 'Heading to User Location',
    steps: ['filling', 'completed'],
    stage: 'completed',
    showContactRow: true,
    buttonLabel: 'Complete Delivery',
  },
};

export default function DeliveryTrackingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ orderId?: string; orderIds?: string }>();
  const isBatch = typeof params.orderIds === 'string';
  const sessionIds = useMemo(
    () => (isBatch ? params.orderIds!.split(',').filter(Boolean) : params.orderId ? [params.orderId] : []),
    [isBatch, params.orderIds, params.orderId]
  );

  const ordersQuery = useRiderOrders();
  const stations = useStations();
  const { orders: activeOrders } = useActiveOrders();
  const earnings = useEarnings();
  const advance = useAdvanceOrder();
  const completeDelivery = useCompleteDelivery();
  const reportIssue = useReportIssue();
  const flaggedIds = useFlaggedIds();
  const position = useLocationStore((s) => s.position);
  const heading = useLocationStore((s) => s.heading);

  const pool = usePool();
  const acceptOffer = useAcceptOrder();
  const declineOffer = useDeclineOrder();

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [busy, setBusy] = useState(false);

  const sessionOrders = useMemo(
    () =>
      sessionIds
        .map((id) => (ordersQuery.data ?? []).find((o) => o.id === id))
        .filter((o): o is ApiOrder => o !== undefined),
    [sessionIds, ordersQuery.data]
  );

  const batch = useMemo(() => deriveBatch(sessionOrders, flaggedIds), [sessionOrders, flaggedIds]);
  const single = !isBatch ? sessionOrders[0] : undefined;

  // The order the rider is working on right now.
  const focusOrder: ApiOrder | undefined = isBatch ? (batch.upNext ?? batch.remaining[0]) : single;
  const focusView = focusOrder ? toOrderView(focusOrder, stations.data) : null;

  const phase: Phase = isBatch
    ? batch.delivering
      ? 'toUserDropoff'
      : 'toStation'
    : (single ? phaseOf(single.status) : null) ?? 'toUserDropoff';

  const station = stations.data?.find((s) => s.id === focusOrder?.stationId);
  const stationLocation: LatLng | null = station ? stationLatLng(station) : null;
  const stationName = station?.name ?? '';
  const customerLocation: LatLng | null = focusOrder ? customerLatLng(focusOrder) : null;

  const targetPosition = phase === 'toStation' ? stationLocation : customerLocation;
  const routeColor = phase === 'toStation' ? '#0085FF' : '#52B922';

  const activeRoute = useRoutePath(position, targetPosition);
  const referenceRoute = useRoutePath(stationLocation, customerLocation);
  const pickupProgress = useLegProgress(position, targetPosition, `${focusOrder?.id}:${phase}`);

  useEffect(() => {
    if (isBatch && batch.allDone) setShowCompleteModal(true);
  }, [isBatch, batch.allDone]);

  const runAction = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      Alert.alert('Error', errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  // Cash orders: confirm the cash before the delivery is completed.
  const deliverOrder = (order: ApiOrder, onDone: () => void) => {
    const finish = () =>
      runAction(async () => {
        await completeDelivery.mutateAsync(order);
        onDone();
      });
    if (order.paymentMethod === 'cash') {
      Alert.alert('Collect cash', `Collect ₵ ${formatMinor(order.pricing.total)} from the customer.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Cash Collected', onPress: () => void finish() },
      ]);
      return;
    }
    void finish();
  };

  const handleStartFilling = () =>
    runAction(async () => {
      for (const order of batch.remaining) {
        if (order.status === 'rider_assigned' || order.status === 'picked_up') {
          await advance.mutateAsync({ order, target: 'filling' });
        }
      }
      router.push({ pathname: '/filling', params: { orderIds: sessionIds.join(',') } });
    });

  const handlePrimaryAction = () => {
    if (isBatch) {
      if (batch.delivering && batch.upNext) {
        deliverOrder(batch.upNext, () => undefined);
      } else {
        void handleStartFilling();
      }
      return;
    }
    if (!single) return;
    if (phase === 'toUserPickup') {
      void runAction(async () => void (await advance.mutateAsync({ order: single, target: 'picked_up' })));
    } else if (phase === 'toStation') {
      void runAction(async () => void (await advance.mutateAsync({ order: single, target: 'en_route_to_customer' })));
    } else {
      deliverOrder(single, () => setShowCompleteModal(true));
    }
  };

  const handleReportIssue = (reasons: OrderIssueReason[], description?: string) => {
    if (!focusOrder) return;
    setShowIssueModal(false);
    void runAction(async () => {
      await reportIssue.mutateAsync({ orderId: focusOrder.id, reasons, description });
    });
  };

  const handleCloseComplete = () => {
    setShowCompleteModal(false);
    // Continue with the rest of the queue. Flagged orders stay active on the server but are skipped.
    const next = activeOrders.filter((o) => !sessionIds.includes(o.id) && !flaggedIds[o.id]);
    if (next.length > 0) {
      router.replace({ pathname: '/tracking', params: { orderId: next[0].id } });
    } else {
      router.replace('/home');
    }
  };

  const offer = !isBatch ? pool.data?.[0] : undefined;
  const offerView = offer ? toOrderView(offer, stations.data) : null;

  const handleAcceptOffer = async () => {
    if (!offer) return;
    try {
      await acceptOffer.mutateAsync(offer.id);
    } catch (error) {
      Alert.alert('Error', errorMessage(error));
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

  if (!focusOrder || !focusView) {
    return (
      <View style={[styles.main, styles.centered, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {ordersQuery.isLoading ? <ActivityIndicator /> : <Text>No active order.</Text>}
        {!ordersQuery.isLoading && (
          <TouchableOpacity onPress={() => router.replace('/home')}>
            <Text style={styles.completeButtonText}>Back to home</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const trackingOrder = isBatch
    ? {
        customerName: focusView.customerName,
        customerPhone: focusView.customerPhone,
        cylinderSize: focusView.cylinderSize,
        amount: batch.remaining.reduce((sum, o) => sum + o.pricing.gasTotal, 0),
        tip: batch.remaining.reduce((sum, o) => sum + o.pricing.tip, 0),
        cylinderCount: batch.remaining.length,
      }
    : focusView;

  const { headerTitle: singleHeaderTitle, steps, stage, showContactRow, buttonLabel } = PHASE_CONFIG[phase];
  const headerTitle = isBatch ? (batch.delivering ? 'Heading to User Location' : 'Heading to filling station') : singleHeaderTitle;
  const focusFlagged = !!flaggedIds[focusOrder.id];
  const canAct = isBatch ? batch.remaining.length > 0 : !!single && single.status !== 'delivered';

  const batchEarned = sessionOrders.reduce((sum, o) => sum + (o.riderCommission ?? 0) + o.pricing.tip, 0);
  const completeEarned = isBatch ? batchEarned : focusView.earnings;

  return (
    <View style={styles.main}>
      <TrackingMap
        position={position}
        heading={heading}
        stationLocation={stationLocation}
        stationName={stationName}
        customerLocation={customerLocation}
        customerName={focusView.customerName}
        batchQueue={isBatch ? batch.queue : null}
        referenceRoute={referenceRoute.coordinates}
        activeRoute={activeRoute.coordinates}
        routeColor={routeColor}
      />

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <BackButton />
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.bottomSheet, { bottom: insets.bottom + 32 }]}>
        {isBatch ? (
          batch.delivering ? (
            <View style={styles.queueCard}>
              <View style={styles.queueHandle} />
              <View style={styles.queueHeaderRow}>
                <Text style={styles.queueTitle}>Order Queue</Text>
                {!!batch.upNext && (
                  <TouchableOpacity style={styles.reportIssueIconButton} onPress={() => setShowIssueModal(true)}>
                    <WarningIcon />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.queueList}>
                {batch.queue.map((o, index) => (
                  <React.Fragment key={o.id}>
                    <OrderQueueRow index={index + 1} order={o} variant="status" />
                    {index < batch.queue.length - 1 && <View style={styles.divider} />}
                  </React.Fragment>
                ))}
              </View>
            </View>
          ) : (
            <TrackingOrderCard
              order={trackingOrder}
              stage="filling"
              steps={['arrived', 'filling', 'completed']}
              onReportIssue={() => setShowIssueModal(true)}
            />
          )
        ) : (
          <TrackingOrderCard
            order={trackingOrder}
            stage={stage}
            steps={steps}
            showContactRow={showContactRow}
            activeProgress={phase === 'toUserPickup' ? pickupProgress : undefined}
            onReportIssue={!focusFlagged ? () => setShowIssueModal(true) : undefined}
          />
        )}

        {!isBatch && focusFlagged && (
          <View style={styles.issueBanner}>
            <WarningIcon />
            <View style={styles.issueBannerTextGroup}>
              <Text style={styles.issueBannerTitle}>Issue reported</Text>
              <Text style={styles.issueBannerSubtitle}>Support and the customer have been told</Text>
            </View>
          </View>
        )}

        {canAct && (
          <TouchableOpacity
            style={[styles.completeButton, busy && styles.completeButtonBusy]}
            onPress={handlePrimaryAction}
            disabled={busy}
          >
            <Text style={styles.completeButtonText}>
              {isBatch ? (batch.delivering ? 'Complete Delivery' : 'Start Filling') : buttonLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ReportOrderIssueModal
        visible={showIssueModal}
        customerName={focusView.customerName}
        onCancel={() => setShowIssueModal(false)}
        onSubmit={handleReportIssue}
      />

      <NewOrderRequestModal
        visible={!!offerView}
        order={offerView}
        onAccept={handleAcceptOffer}
        onDecline={handleDeclineOffer}
      />

      <DeliveryCompleteModal
        visible={showCompleteModal}
        orderId={isBatch ? `${sessionOrders.length} orders` : focusView.id}
        customerName={isBatch ? 'Batch delivery' : focusView.customerName}
        earned={completeEarned}
        stats={{
          todayDeliveries: earnings.data?.todayDeliveries ?? 0,
          totalEarned: earnings.data?.totalEarned ?? 0,
          rating: earnings.data?.rating ?? null,
        }}
        onDismiss={handleCloseComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  completeButtonBusy: {
    opacity: 0.6,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: {
    width: 36,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  bottomSheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 32,
    gap: 12,
  },
  queueCard: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
    paddingTop: 2,
    paddingBottom: 8,
    gap: 12,
  },
  queueHandle: {
    alignSelf: 'center',
    width: 49,
    height: 4,
    borderRadius: 4,
    backgroundColor: '#F4F4F4',
    marginTop: 8,
  },
  queueHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  queueTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  queueList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 8,
    paddingVertical: 8,
    gap: 12,
    shadowColor: 'rgba(12,12,13,0.15)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginHorizontal: 12,
  },
  completeButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  reportIssueIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(180,35,24,0.3)',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  issueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FEF3F2',
    borderWidth: 1,
    borderColor: '#FECDCA',
  },
  issueBannerTextGroup: {
    flex: 1,
    gap: 2,
  },
  issueBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B42318',
  },
  issueBannerSubtitle: {
    fontSize: 12,
    color: 'rgba(180,35,24,0.8)',
  },
});
