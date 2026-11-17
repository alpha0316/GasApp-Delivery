import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import BackButton from '../../../components/BackButton';
import CancelOrderModal from '../../../components/CancelOrderModal';
import TrackingOrderCard from '../../../components/TrackingOrderCard';
import NewOrderRequestModal from '../../../components/NewOrderRequestModal';
import DeliveryCompleteModal from '../../../components/DeliveryCompleteModal';
import ReportOrderIssueModal from '../../../components/ReportOrderIssueModal';
import { PhoneCallDuotoneIcon, WarningIcon } from '../../../components/icons/OrderCardIcons';
import { errorMessage } from '../../../lib/api/client';
import { orderAcceptErrorMessage } from '../../../lib/orders/errors';
import { formatMinor } from '../../../lib/format/money';
import type { ApiOrder } from '../../../lib/api/types';
import type { CancelReason } from '../../../lib/orders/cancelReasons';
import { DeliveryStage, LatLng, OrderIssueReason } from '../../../types/order';
import { useEarnings } from '../../earnings/hooks';
import { useLocationStore } from '../../location/store';
import {
  useActiveOrders,
  useAdvanceOrder,
  useCancelOrder,
  useCompleteDelivery,
  useFlaggedIds,
  useReportIssue,
  useRiderOrders,
  useStations,
} from '../../orders/hooks';
import { phaseOf, type Phase } from '../../orders/flow';
import { customerLatLng, stationLatLng, toOrderView } from '../../orders/mappers';
import { useAcceptOrder, useDeclineOrder, usePool } from '../../pool/hooks';
import { useOfferWindows } from '../../pool/useOfferWindows';
import { distanceMeters } from '../../../utils/geo';
import { deriveBatch } from '../batch';
import TrackingMap from '../TrackingMap';
import { useLegProgress, useRoutePath } from '../hooks';

// Close enough to a pin (customer or filling station) to count as "arrived"
// and auto-advance the order without a manual tap.
const ARRIVAL_RADIUS_METERS = 60;

// How long a single order's cylinder takes to fill at the station - matches
// StatusTimeline's default "Arriving in 5 minutes" estimate. "Filled up" is
// automatic once this elapses, no manual tap needed.
const FILLING_DURATION_MS = 5 * 60_000;

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
    // Section 2.3: "On the way" is the customer-facing label for this leg;
    // distinct from toUserPickup's header so the two legs aren't identical.
    headerTitle: 'On the Way to Customer',
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
  const cancelOrder = useCancelOrder();
  const flaggedIds = useFlaggedIds();
  const position = useLocationStore((s) => s.position);
  const heading = useLocationStore((s) => s.heading);

  const pool = usePool();
  const acceptOffer = useAcceptOrder();
  const declineOffer = useDeclineOrder();

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  // The id of whichever order the cancel sheet currently targets - just the
  // current focus order here; referring other queued orders happens on Home.
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sessionOrders = useMemo(
    () =>
      sessionIds
        .map((id) => (ordersQuery.data ?? []).find((o) => o.id === id))
        .filter((o): o is ApiOrder => o !== undefined),
    [sessionIds, ordersQuery.data]
  );

  const batch = useMemo(
    () => deriveBatch(sessionOrders, flaggedIds, stations.data),
    [sessionOrders, flaggedIds, stations.data]
  );
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

  // Once the batch rider's GPS is within range of the filling station, open
  // the filling checklist automatically instead of waiting on a manual tap.
  const startedFillingRef = useRef(false);
  useEffect(() => {
    if (!isBatch || batch.delivering || busy || startedFillingRef.current) return;
    if (!position || !stationLocation) return;
    if (distanceMeters(position, stationLocation) > ARRIVAL_RADIUS_METERS) return;
    startedFillingRef.current = true;
    void handleStartFilling();
  }, [isBatch, batch.delivering, busy, position, stationLocation]);

  // Once a single-order rider's GPS is within range of the customer, mark
  // the cylinder picked up automatically instead of waiting on a manual tap.
  const startedPickupRef = useRef(false);
  useEffect(() => {
    if (isBatch || phase !== 'toUserPickup' || !single || busy || startedPickupRef.current) return;
    if (!position || !customerLocation) return;
    if (distanceMeters(position, customerLocation) > ARRIVAL_RADIUS_METERS) return;
    startedPickupRef.current = true;
    void runAction(async () => void (await advance.mutateAsync({ order: single, target: 'picked_up' })));
  }, [isBatch, phase, single, busy, position, customerLocation]);

  // The rider is stationary at the filling station for this leg, so there's
  // no GPS arrival to trigger on - instead, "Filled up" happens automatically
  // once the card's own "Arriving in {etaMinutes} minutes" estimate elapses.
  const fillingTimerRef = useRef<{ orderId: string; startedAt: number } | null>(null);
  useEffect(() => {
    if (isBatch || phase !== 'toStation' || !single || busy) return;
    if (fillingTimerRef.current?.orderId !== single.id) {
      fillingTimerRef.current = { orderId: single.id, startedAt: Date.now() };
    }
    const elapsed = Date.now() - fillingTimerRef.current.startedAt;
    const timeout = setTimeout(
      () => void runAction(async () => void (await advance.mutateAsync({ order: single, target: 'en_route_to_customer' }))),
      Math.max(0, FILLING_DURATION_MS - elapsed)
    );
    return () => clearTimeout(timeout);
  }, [isBatch, phase, single, busy]);

  const handlePrimaryAction = () => {
    if (isBatch) {
      if (batch.upNext) deliverOrder(batch.upNext, () => undefined);
      return;
    }
    if (!single) return;
    deliverOrder(single, () => setShowCompleteModal(true));
  };

  const handleReportIssue = (reasons: OrderIssueReason[], description?: string) => {
    if (!focusOrder) return;
    setShowIssueModal(false);
    void runAction(async () => {
      await reportIssue.mutateAsync({ orderId: focusOrder.id, reasons, description });
    });
  };

  const handleCancelOrder = (reason: CancelReason) => {
    const targetId = cancelTargetId;
    if (!targetId) return;
    setCancelTargetId(null);
    void runAction(async () => {
      await cancelOrder.mutateAsync({ orderId: targetId, reason });
      // Only leave the tracking screen once nothing else in this session is
      // still active - referring one order out of a batch keeps the rest going.
      const stillActive = sessionOrders.some(
        (o) => o.id !== targetId && o.status !== 'delivered' && o.status !== 'cancelled' && o.status !== 'refunded'
      );
      if (!stillActive) router.replace('/home');
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
  const offerExpiresAt = useOfferWindows(offer ? [offer.id] : []);
  // Closing the popup just hides it; a fresh offer (different id) always
  // starts shown again.
  const [offerDismissed, setOfferDismissed] = useState(false);
  useEffect(() => setOfferDismissed(false), [offer?.id]);

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

  if (!focusOrder || !focusView) {
    return (
      <View style={[styles.main, styles.centered]}>
        {ordersQuery.isLoading ? <ActivityIndicator /> : <Text>No active order.</Text>}
        {!ordersQuery.isLoading && (
          <TouchableOpacity onPress={() => router.replace('/home')}>
            <Text style={styles.completeButtonText}>Back to home</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Filling is the one leg where the batch rider handles every cylinder at
  // once, so its card aggregates the whole batch. Once delivering, the rider
  // is back to one order at a time - focusView (batch.upNext) is already that.
  const trackingOrder =
    isBatch && !batch.delivering
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
  const headerTitle = isBatch ? (batch.delivering ? 'On the Way to Customer' : 'Heading to filling station') : singleHeaderTitle;
  const focusFlagged = !!flaggedIds[focusOrder.id];
  // While heading to the filling station (batch) or the customer for pickup
  // (single), arrival auto-advances the order; the single-order filling leg
  // auto-advances on its own timer too (see the effects above). None of
  // those legs need a manual action.
  const canAct = isBatch
    ? batch.delivering && batch.remaining.length > 0
    : !!single && single.status !== 'delivered' && phase !== 'toUserPickup' && phase !== 'toStation';
  // Section 2.1, step 8: only cancellable before the cylinder is picked up.
  const canCancel = focusOrder.status === 'rider_assigned';

  const batchEarned = sessionOrders.reduce((sum, o) => sum + (o.riderCommission ?? 0) + o.pricing.tip, 0);
  const completeEarned = isBatch ? batchEarned : focusView.earnings;

  // The warning icon is the single entry point for both reporting a problem
  // and cancelling: cancelling is only offered while it's still possible.
  const handleIssuePress = () => {
    if (!canCancel) {
      setShowIssueModal(true);
      return;
    }
    Alert.alert('What do you need?', undefined, [
      { text: 'Report an issue', onPress: () => setShowIssueModal(true) },
      { text: 'Cancel order', style: 'destructive', onPress: () => setCancelTargetId(focusOrder.id) },
      { text: 'Dismiss', style: 'cancel' },
    ]);
  };

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
        {focusView.customerPhone ? (
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => Linking.openURL(`tel:${focusView.customerPhone}`)}
            accessibilityRole="button"
            accessibilityLabel="Call customer"
          >
            <PhoneCallDuotoneIcon />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <View style={styles.bottomSheet}>
        {isBatch ? (
          batch.delivering ? (
            // One order at a time once delivering - the rest of the queue is
            // managed from the home screen, not re-shown here.
            <TrackingOrderCard
              order={trackingOrder}
              stage="completed"
              steps={['filling', 'completed']}
              showContactRow
              onReportIssue={handleIssuePress}
            />
          ) : (
            <TrackingOrderCard
              order={trackingOrder}
              stage="filling"
              steps={['arrived', 'filling', 'completed']}
              onReportIssue={handleIssuePress}
            />
          )
        ) : (
          <TrackingOrderCard
            order={trackingOrder}
            stage={stage}
            steps={steps}
            showContactRow={showContactRow}
            activeProgress={phase === 'toUserPickup' ? pickupProgress : undefined}
            onReportIssue={!focusFlagged ? handleIssuePress : undefined}
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
            <Text style={styles.completeButtonText}>{isBatch ? 'Complete Delivery' : buttonLabel}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ReportOrderIssueModal
        visible={showIssueModal}
        customerName={focusView.customerName}
        onCancel={() => setShowIssueModal(false)}
        onSubmit={handleReportIssue}
      />

      <CancelOrderModal
        visible={!!cancelTargetId}
        onCancel={() => setCancelTargetId(null)}
        onSubmit={handleCancelOrder}
      />

      <NewOrderRequestModal
        visible={!!offerView && !offerDismissed}
        order={offerView}
        offerExpiresAt={offer ? offerExpiresAt(offer.id) : new Date().toISOString()}
        onAccept={handleAcceptOffer}
        onDecline={handleDeclineOffer}
        onDismiss={() => setOfferDismissed(true)}
        busy={acceptOffer.isPending || declineOffer.isPending}
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
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: {
    width: 36,
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F6F6F6',
    alignItems: 'center',
    justifyContent: 'center',
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
