import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { CaretDown, X } from 'phosphor-react-native';
import BackButton from '../../../components/BackButton';
import CancelOrderModal from '../../../components/CancelOrderModal';
import TrackingOrderCard from '../../../components/TrackingOrderCard';
import NewOrderRequestModal from '../../../components/NewOrderRequestModal';
import NextRideSheet from '../../../components/NextRideSheet';
import DeliveryCompleteModal from '../../../components/DeliveryCompleteModal';
import ArrivalSheet from '../../../components/ArrivalSheet';
import BatchCustomersSheet, { type BatchStop } from '../../../components/BatchCustomersSheet';
import { showToast } from '../../../components/Toast';
import ReportOrderIssueModal from '../../../components/ReportOrderIssueModal';
import { PhoneCallDuotoneIcon, WarningIcon } from '../../../components/icons/OrderCardIcons';
import { errorMessage } from '../../../lib/api/client';
import { MOCK_API, mockSpawnIncomingOrder } from '../../../lib/api/devMock';
import { useQueryClient } from '@tanstack/react-query';
import { orderAcceptErrorMessage } from '../../../lib/orders/errors';
import { formatMinor } from '../../../lib/format/money';
import type { ApiOrder } from '../../../lib/api/types';
import type { CancelReason } from '../../../lib/orders/cancelReasons';
import { DeliveryStage, LatLng, OrderIssueReason } from '../../../types/order';
import { useAuthStore } from '../../auth/store';
import { useEarnings } from '../../earnings/hooks';
import { useSimStore, useSimulatedDrive } from '../../location/simulator';
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
import { poolKey, useAcceptOrder, useDeclineOrder, usePool } from '../../pool/hooks';
import { useOfferWindows } from '../../pool/useOfferWindows';
import { riderModeFor } from '../../pool/vehicleMode';
import { useNotificationPrefs } from '../../settings/notificationSettings';
import { distanceMeters } from '../../../utils/geo';
import { deriveBatch } from '../batch';
import TrackingMap, { CUSTOMER_PIN_COLORS, type CustomerPin, type StationPin } from '../TrackingMap';
import { useLegProgress, useRoutePath } from '../hooks';

// Close enough to a pin (customer or filling station) to count as "arrived"
// and auto-advance the order without a manual tap.
const ARRIVAL_RADIUS_METERS = 60;

// How long a single order's cylinder takes to fill at the station - matches
// StatusTimeline's default "Arriving in 5 minutes" estimate. "Filled up" is
// automatic once this elapses, no manual tap needed.
// The mock drive simulator speeds this up so a demo doesn't sit still for
// five minutes.
const FILLING_DURATION_MS = MOCK_API ? 8_000 : 5 * 60_000;

// Where the rider is heading on the current leg of the trip.
type Leg = 'pickup' | 'station' | 'dropoff';
const PHASE_OF_LEG: Record<Leg, Phase> = { pickup: 'toUserPickup', station: 'toStation', dropoff: 'toUserDropoff' };
const LEG_OF_PHASE: Record<Phase, Leg> = { toUserPickup: 'pickup', toStation: 'station', toUserDropoff: 'dropoff' };

const liveOrdersFor = (orders: ApiOrder[]) =>
  orders.filter((o) => o.status !== 'cancelled' && o.status !== 'refunded');

const firstName = (name: string) => name.split(' ')[0] || name;
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

// iOS can't present a modal while another is still animating closed - the
// second one silently never appears. Opening the next sheet after the first
// has finished closing avoids that.
const MODAL_CLOSE_MS = 400;
const afterModalCloses = (open: () => void) => setTimeout(open, MODAL_CLOSE_MS);

// True once `blocked` has been false for MODAL_CLOSE_MS. A sheet that opens on
// its own (arrival, new-order offer) waits its turn with this: presenting one
// while another is open or still closing fails silently on iOS and can leave an
// invisible layer over the screen that swallows every tap.
function useModalTurn(blocked: boolean): boolean {
  const [clear, setClear] = useState(!blocked);
  useEffect(() => {
    if (blocked) {
      setClear(false);
      return;
    }
    const timeout = setTimeout(() => setClear(true), MODAL_CLOSE_MS);
    return () => clearTimeout(timeout);
  }, [blocked]);
  return clear && !blocked;
}

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
  const vehicleType = useAuthStore((s) => s.user?.vehicleType);
  // The filling screen sits on top of this one mid-batch; nothing here should
  // react to arrivals while it's covered.
  const focused = useIsFocused();

  const pool = usePool();
  const acceptOffer = useAcceptOrder();
  const declineOffer = useDeclineOrder();

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  // The id of whichever order the cancel sheet currently targets - just the
  // current focus order here; referring other queued orders happens on Home.
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // After a delivery, while more orders are queued: start the next or refer it.
  const [showNextSheet, setShowNextSheet] = useState(false);
  // Orders referred from that sheet, hidden straight away rather than waiting
  // for the orders refetch to drop them.
  const [referredIds, setReferredIds] = useState<string[]>([]);

  // Orders waiting after this session. Flagged orders stay active on the server but are skipped.
  const queue = useMemo(
    () => activeOrders.filter((o) => !sessionIds.includes(o.id) && !flaggedIds[o.id] && !referredIds.includes(o.id)),
    [activeOrders, sessionIds, flaggedIds, referredIds]
  );
  const nextOrder = queue[0];

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

  // The order the rider is working on right now. A batch rider collects every
  // empty cylinder first, then fills them all at the station, then delivers
  // them one at a time.
  // Every batch order delivered: keep showing the last stop so the completion
  // modal (and the next-ride sheet after it) can still open on this screen.
  const finished = isBatch && batch.allDone;
  const focusOrder: ApiOrder | undefined = isBatch
    ? (batch.upNext ??
      batch.nextPickup ??
      batch.stationOrders[0] ??
      batch.remaining[0] ??
      (finished ? [...sessionOrders].reverse().find((o) => o.status === 'delivered') : undefined))
    : single;
  const focusView = focusOrder ? toOrderView(focusOrder, stations.data) : null;

  // Nothing to show (orders gone, or a stale link): go home rather than leave
  // the rider on a blank screen. A just-accepted order isn't in the cached list
  // yet when this screen opens, so wait for the refetch to land, and try one
  // more refetch, before deciding it's really missing.
  const nothingToShow = !ordersQuery.isLoading && !ordersQuery.isFetching && !focusOrder;
  const refetchedForMissingRef = useRef(false);
  useEffect(() => {
    if (!nothingToShow) return;
    if (!refetchedForMissingRef.current) {
      refetchedForMissingRef.current = true;
      void ordersQuery.refetch();
      return;
    }
    router.replace('/home');
    // ordersQuery.refetch is stable; only react to the missing state changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nothingToShow, router]);

  const leg: Leg = isBatch
    ? batch.delivering || finished
      ? 'dropoff'
      : batch.collecting
        ? 'pickup'
        : 'station'
    : LEG_OF_PHASE[(single ? phaseOf(single.status) : null) ?? 'toUserDropoff'];
  const phase: Phase = PHASE_OF_LEG[leg];
  const legKey = `${focusOrder?.id}:${leg}`;

  const station = stations.data?.find((s) => s.id === focusOrder?.stationId);
  const stationLocation: LatLng | null = station ? stationLatLng(station) : null;
  const stationName = station?.name ?? '';
  const customerLocation: LatLng | null = focusOrder ? customerLatLng(focusOrder) : null;

  const targetPosition = leg === 'station' ? stationLocation : customerLocation;

  // Every station this run uses: the one being driven to now, the ones still
  // to visit, and the ones already done (customers may pick different stations).
  const stationPins = useMemo<StationPin[]>(() => {
    const ids = isBatch ? batch.stationIds : station ? [station.id] : [];
    const pending = new Set(
      batch.remaining
        .filter((o) => o.status === 'rider_assigned' || o.status === 'picked_up' || o.status === 'filling')
        .map((o) => o.stationId)
    );
    return ids
      .map((id) => stations.data?.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map((s) => ({
        id: s.id,
        name: s.name,
        location: stationLatLng(s),
        state:
          s.id === station?.id && leg === 'station'
            ? 'current'
            : !isBatch || pending.has(s.id)
              ? 'pending'
              : 'done',
      }));
  }, [isBatch, batch.stationIds, batch.remaining, stations.data, station, leg]);
  const routeColor = leg === 'station' ? '#0085FF' : leg === 'pickup' ? CUSTOMER_PIN_COLORS.pickup : '#52B922';

  // Mock mode: drive the simulated rider to the current target.
  useSimulatedDrive(focusOrder && !batch.allDone ? targetPosition : null, vehicleType);
  const simPath = useSimStore((s) => s.remainingPath);

  // The mock simulator already knows the exact path it's driving, so it's
  // drawn directly instead of being asked for again on every tick.
  const activeRoute = useRoutePath(MOCK_API ? null : position, targetPosition);
  const referenceRoute = useRoutePath(stationLocation, customerLocation);
  const activeRouteCoords = MOCK_API ? simPath : activeRoute.coordinates;
  const legProgress = useLegProgress(position, targetPosition, legKey);

  const arrived =
    !!position && !!targetPosition && distanceMeters(position, targetPosition) <= ARRIVAL_RADIUS_METERS;

  // Every customer in the session, coloured by what's left to do there.
  const customerPins = useMemo<CustomerPin[]>(
    () =>
      sessionOrders
        .filter((o) => o.status !== 'cancelled' && o.status !== 'refunded')
        .map((o) => {
          const view = toOrderView(o, stations.data);
          const done = o.status === 'delivered' || !!flaggedIds[o.id];
          return {
            id: o.id,
            name: view.customerName,
            location: customerLatLng(o),
            color: done
              ? CUSTOMER_PIN_COLORS.done
              : o.status === 'rider_assigned'
                ? CUSTOMER_PIN_COLORS.pickup
                : CUSTOMER_PIN_COLORS.dropoff,
          };
        }),
    [sessionOrders, stations.data, flaggedIds]
  );

  const liveOrders = liveOrdersFor(sessionOrders);
  const pickupsLeft = liveOrders.filter((o) => o.status === 'rider_assigned' && !flaggedIds[o.id]).length;
  const dropoffsLeft = batch.remaining.filter((o) => o.status === 'en_route_to_customer').length;

  // A customer pin the rider tapped: its road route is previewed on the map.
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const selectedPin = customerPins.find((c) => c.id === selectedPinId) ?? null;
  const previewRoute = useRoutePath(selectedPin ? position : null, selectedPin?.location ?? null);
  const previewDistanceKm =
    previewRoute.distanceKm ?? (selectedPin && position ? distanceMeters(position, selectedPin.location) / 1000 : null);

  // The arrival sheet open right now, if any.
  const [arrivalSheet, setArrivalSheet] = useState<'pickup' | 'dropoff' | null>(null);
  // The batch's customer list, opened from the header title.
  const [showStops, setShowStops] = useState(false);
  const showStopsRef = useRef(false);
  showStopsRef.current = showStops;
  // iOS can't present one modal while another is open, so close the list first.
  const openArrivalSheet = (kind: 'pickup' | 'dropoff') => {
    if (showStopsRef.current) {
      setShowStops(false);
      afterModalCloses(() => setArrivalSheet(kind));
    } else {
      setArrivalSheet(kind);
    }
  };

  // Collecting (and heading to the station) lists the pickups; delivering lists the drop-offs.
  const stopsMode: 'collect' | 'deliver' = leg === 'dropoff' ? 'deliver' : 'collect';
  const batchStops = useMemo<BatchStop[]>(
    () =>
      liveOrdersFor(sessionOrders).map((o) => {
        const view = toOrderView(o, stations.data);
        const done = stopsMode === 'collect' ? o.status !== 'rider_assigned' : o.status === 'delivered';
        return {
          id: o.id,
          name: view.customerName,
          phone: view.customerPhone,
          address: view.dropoffAddress,
          cylinders: `${view.cylinderCount} × ${view.cylinderSize}`,
          station: batch.stationIds.length > 1 ? view.fillingStationName : undefined,
          location: customerLatLng(o),
          state: done ? 'done' : o.id === focusOrder?.id && leg !== 'station' ? 'next' : 'pending',
          amount: o.pricing.total,
          distanceMeters: position ? distanceMeters(position, customerLatLng(o)) : null,
          createdAt: o.createdAt,
        };
      }),
    // Distances only need refreshing while the list is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionOrders, stations.data, stopsMode, focusOrder?.id, leg, batch.stationIds.length, showStops ? position : null]
  );

  useEffect(() => {
    if (isBatch && batch.allDone) afterModalCloses(() => setShowCompleteModal(true));
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

  // Cash orders: confirm the cash before the delivery is completed. The
  // arrival sheet already says how much to collect, so it skips the prompt.
  const deliverOrder = (order: ApiOrder, onDone: () => void, cashConfirmed = false) => {
    const finish = () =>
      runAction(async () => {
        await completeDelivery.mutateAsync(order);
        onDone();
      });
    if (order.paymentMethod === 'cash' && !cashConfirmed) {
      Alert.alert('Collect cash', `Collect ₵ ${formatMinor(order.pricing.total)} from the customer.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Cash Collected', onPress: () => void finish() },
      ]);
      return;
    }
    void finish();
  };

  // Fills only the orders for the station the rider is at: customers in one
  // batch may have picked different stations, visited one after another.
  const handleStartFilling = () =>
    runAction(async () => {
      const here = batch.stationOrders;
      for (const order of here) {
        if (order.status === 'picked_up') {
          await advance.mutateAsync({ order, target: 'filling' });
        }
      }
      router.push({
        pathname: '/filling',
        params: {
          orderIds: here.map((o) => o.id).join(','),
          stationName,
          moreStations: String(Math.max(0, batch.stationsLeft - 1)),
        },
      });
    });

  const confirmPickup = () => {
    if (!focusOrder || !focusView) return;
    const name = firstName(focusView.customerName);
    const leftAfter = pickupsLeft - 1;
    void runAction(async () => {
      await advance.mutateAsync({ order: focusOrder, target: 'picked_up' });
      setArrivalSheet(null);
      showToast(`Collected from ${name}`, {
        tone: 'success',
        message:
          isBatch && leftAfter > 0
            ? `${plural(leftAfter, 'more pickup')} before the filling station`
            : `Heading to ${stationName || 'the filling station'}`,
      });
    });
  };

  const handleDelivered = (name: string) => {
    setArrivalSheet(null);
    const left = isBatch ? Math.max(0, dropoffsLeft - 1) : 0;
    showToast(`Delivered to ${firstName(name)}`, {
      tone: 'success',
      message: left > 0 ? `${plural(left, 'more drop-off')} to go` : 'Nice work!',
    });
    if (!isBatch) afterModalCloses(() => setShowCompleteModal(true));
  };

  const confirmDropoff = () => {
    if (!focusOrder || !focusView) return;
    deliverOrder(focusOrder, () => handleDelivered(focusView.customerName), true);
  };

  // Mock mode: a new customer orders nearby about 20 s into the ride, once
  // per tracking screen, so joining a run can be tried.
  const queryClient = useQueryClient();
  const spawnedRef = useRef(false);
  useEffect(() => {
    if (!MOCK_API || spawnedRef.current || finished || !focusOrder) return;
    const timeout = setTimeout(() => {
      const near = useLocationStore.getState().position;
      if (!near || spawnedRef.current) return;
      spawnedRef.current = true;
      if (mockSpawnIncomingOrder(near)) void queryClient.invalidateQueries({ queryKey: poolKey });
    }, 20_000);
    return () => clearTimeout(timeout);
  }, [finished, focusOrder, queryClient]);

  // Announce the leg on the way in, so a fresh tracking screen says where it's going.
  const announcedRef = useRef(false);
  useEffect(() => {
    if (announcedRef.current || !focusOrder || !focusView) return;
    announcedRef.current = true;
    const name = firstName(focusView.customerName);
    if (leg === 'pickup') {
      showToast('Ride started', {
        message: isBatch
          ? `${plural(pickupsLeft, 'pickup')} to make, starting with ${name}`
          : `Heading to ${name} to collect the empty cylinder`,
      });
    } else if (leg === 'station') {
      showToast('Heading to the filling station', { message: stationName || undefined });
    } else {
      showToast(`On the way to ${name}`, {
        message: isBatch ? `${plural(dropoffsLeft, 'drop-off')} in this batch` : focusView.dropoffAddress,
      });
    }
  }, [focusOrder, focusView, leg, isBatch, pickupsLeft, dropoffsLeft, stationName]);

  // Reaching the target triggers whatever that stop needs, once per leg:
  // a sheet to confirm pickup/hand-over, or the filling step at the station.
  const handledArrivalRef = useRef<string | null>(null);
  useEffect(() => {
    if (!focused || finished || !focusOrder || !focusView || !arrived || busy) return;
    if (handledArrivalRef.current === legKey) return;
    handledArrivalRef.current = legKey;
    const name = firstName(focusView.customerName);

    if (leg === 'pickup') {
      showToast(`Arrived at ${name}'s location`, { message: 'Collect the empty cylinder', tone: 'info' });
      openArrivalSheet('pickup');
      return;
    }
    if (leg === 'dropoff') {
      showToast(`Arrived at ${name}'s location`, { message: 'Hand over the full cylinder', tone: 'info' });
      openArrivalSheet('dropoff');
      return;
    }
    // At the filling station.
    if (isBatch) {
      showToast(`Arrived at ${stationName || 'the station'}`, {
        message:
          batch.stationIds.length > 1
            ? `Fill the ${plural(batch.stationOrders.length, 'order')} for this station`
            : `Fill all ${plural(batch.stationOrders.length, 'order')}`,
      });
      void handleStartFilling();
    } else if (single && single.status === 'picked_up') {
      void runAction(async () => {
        await advance.mutateAsync({ order: single, target: 'filling' });
        showToast(`Arrived at ${stationName || 'the station'}`, { message: 'Filling the cylinder now' });
      });
    }
  }, [focused, finished, focusOrder, focusView, arrived, busy, legKey, leg, isBatch, single, stationName, batch.stationOrders.length, batch.stationIds.length]);

  // A single order fills once the rider is at the station: "Filled up" is
  // automatic after FILLING_DURATION_MS, no manual tap needed.
  const fillingTimerRef = useRef<{ orderId: string; startedAt: number } | null>(null);
  const fillingNow = !isBatch && !!single && single.status === 'filling' && arrived;
  useEffect(() => {
    if (!fillingNow || !single || busy) return;
    if (fillingTimerRef.current?.orderId !== single.id) {
      fillingTimerRef.current = { orderId: single.id, startedAt: Date.now() };
    }
    const elapsed = Date.now() - fillingTimerRef.current.startedAt;
    const name = toOrderView(single, stations.data).customerName;
    const timeout = setTimeout(
      () =>
        void runAction(async () => {
          await advance.mutateAsync({ order: single, target: 'en_route_to_customer' });
          showToast('Cylinder filled', { tone: 'success', message: `Heading back to ${firstName(name)}` });
        }),
      Math.max(0, FILLING_DURATION_MS - elapsed)
    );
    return () => clearTimeout(timeout);
  }, [fillingNow, single, busy]);

  const handlePrimaryAction = () => {
    if (leg === 'pickup') {
      confirmPickup();
      return;
    }
    if (leg === 'station') {
      if (isBatch) void handleStartFilling();
      return;
    }
    if (!focusOrder || !focusView) return;
    deliverOrder(focusOrder, () => handleDelivered(focusView.customerName));
  };

  const handleReportIssue = (reasons: OrderIssueReason[], description?: string) => {
    if (!focusOrder) return;
    setShowIssueModal(false);
    void runAction(async () => {
      await reportIssue.mutateAsync({ orderId: focusOrder.id, reasons, description });
      showToast('Issue reported', { tone: 'warning', message: 'Support and the customer have been told' });
    });
  };

  const handleCancelOrder = (reason: CancelReason) => {
    const targetId = cancelTargetId;
    if (!targetId) return;
    setCancelTargetId(null);
    // Referred from the next-ride sheet: offer the following queued order, if any.
    if (!sessionIds.includes(targetId)) {
      void runAction(async () => {
        await cancelOrder.mutateAsync({ orderId: targetId, reason });
        setReferredIds((ids) => [...ids, targetId]);
        const remaining = queue.filter((o) => o.id !== targetId);
        if (remaining.length > 0) afterModalCloses(() => setShowNextSheet(true));
        else router.replace('/home');
      });
      return;
    }
    void runAction(async () => {
      await cancelOrder.mutateAsync({ orderId: targetId, reason });
      showToast('Order cancelled', { tone: 'warning' });
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
    if (queue.length === 0) {
      router.replace('/home');
      return;
    }
    // A motorbike's next queued order starts by itself.
    // (The new tracking screen announces itself with a "Ride started" toast.)
    if (singleRider && nextOrder) {
      afterModalCloses(() => router.replace({ pathname: '/tracking', params: { orderId: nextOrder.id } }));
      return;
    }
    // A batch rider chooses to start the next batch or refer it.
    afterModalCloses(() => setShowNextSheet(true));
  };

  const handleStartNext = () => {
    if (!nextOrder) return;
    setShowNextSheet(false);
    // A tricycle/car/truck starts everything queued as its next batch; a
    // motorbike takes the next order on its own.
    if (riderModeFor(vehicleType) === 'batch') {
      router.replace({ pathname: '/tracking', params: { orderIds: queue.map((o) => o.id).join(',') } });
      return;
    }
    router.replace({ pathname: '/tracking', params: { orderId: nextOrder.id } });
  };

  const handleReferNext = () => {
    if (!nextOrder) return;
    setShowNextSheet(false);
    // The cancel sheet's reasons double as the referral reasons, as on Home.
    afterModalCloses(() => setCancelTargetId(nextOrder.id));
  };

  const handleCancelSheetClosed = () => {
    const targetId = cancelTargetId;
    setCancelTargetId(null);
    // Backed out of referring a queued order: return to the next-ride choice.
    if (targetId && !sessionIds.includes(targetId)) afterModalCloses(() => setShowNextSheet(true));
  };

  // A new job mid-delivery can join this run: the rider collects that
  // customer's cylinder too, or refers the job on to other riders.
  const offer = !finished ? pool.data?.find((o) => !sessionIds.includes(o.id)) : undefined;
  // A motorbike carries one order at a time, so a new one always waits in its
  // queue. A tricycle/car/truck that has already filled this batch can't
  // collect another empty cylinder on the way: a new order waits for the next batch.
  const singleRider = riderModeFor(vehicleType) === 'single';
  const offerJoinsNextBatch = !singleRider && leg === 'dropoff';
  const offerQueues = singleRider || offerJoinsNextBatch;
  const offerView = offer ? toOrderView(offer, stations.data) : null;
  const offerExpiresAt = useOfferWindows(offer ? [offer.id] : []);
  // Profile -> Notification can turn off job pop-ups while on a delivery.
  const jobPopups = useNotificationPrefs((s) => s.jobBanners);
  // Closing the popup just hides it; a fresh offer (different id) always
  // starts shown again.
  const [offerDismissed, setOfferDismissed] = useState(false);
  useEffect(() => setOfferDismissed(false), [offer?.id]);

  const handleAcceptOffer = async () => {
    if (!offer) return;
    try {
      const { order } = await acceptOffer.mutateAsync(offer.id);
      if (offerQueues) {
        // Stays out of this session: it's in the queue. A motorbike's starts
        // by itself after this delivery; a batch rider's joins the next batch.
        showToast(singleRider ? 'Added to your queue' : 'Added to your next batch', {
          tone: 'success',
          message: singleRider ? 'It starts when this delivery is done' : 'Start it once these drop-offs are done',
        });
        return;
      }
      // Turn this screen into a batch run that includes the new order. The
      // batch flow collects it next (before the station), or right after the
      // current drop-off if the rider is already delivering.
      router.setParams({ orderIds: [...sessionIds, order.id].join(','), orderId: undefined });
      showToast('Order added to your run', {
        tone: 'success',
        message: leg === 'dropoff' ? 'You\'ll collect it after this drop-off' : 'Collect it before the filling station',
      });
    } catch (error) {
      Alert.alert('Error', orderAcceptErrorMessage(error));
    }
  };

  const handleDeclineOffer = async () => {
    if (!offer) return;
    try {
      await declineOffer.mutateAsync(offer.id);
      showToast('Referred to other riders', { message: 'Someone nearby will pick it up' });
    } catch (error) {
      Alert.alert('Error', errorMessage(error));
    }
  };

  // One sheet at a time. The rider-opened sheets (issue, cancel, customer list,
  // completion, next ride) block the automatic ones. Between the automatic
  // two, whichever is already showing keeps the screen; if both want it at
  // once, the arrival sheet goes first.
  const riderSheetOpen = showIssueModal || !!cancelTargetId || showStops || showCompleteModal || showNextSheet;
  const offerWanted = !!offerView && !offerDismissed && jobPopups;
  // Whether the offer was on screen as of the last render (state, so a change
  // always re-renders and lets the other sheet take its turn).
  const [offerOnScreen, setOfferOnScreen] = useState(false);
  const arrivalTurn = useModalTurn(riderSheetOpen || offerOnScreen);
  const arrivalVisible = arrivalSheet !== null && focused && arrivalTurn;
  const offerTurn = useModalTurn(riderSheetOpen || arrivalVisible || (arrivalSheet !== null && !offerOnScreen));
  const offerVisible = offerWanted && offerTurn;
  useEffect(() => setOfferOnScreen(offerVisible), [offerVisible]);

  if (!focusOrder || !focusView) {
    return (
      <View style={[styles.main, styles.centered]}>
        {!nothingToShow ? <ActivityIndicator /> : <Text>No active order.</Text>}
        {nothingToShow && (
          <TouchableOpacity onPress={() => router.replace('/home')} accessibilityRole="button">
            <Text style={styles.backHomeText}>Back to home</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Filling is the one leg where the batch rider handles every cylinder at
  // once, so its card aggregates the whole batch. Once delivering, the rider
  // is back to one order at a time - focusView (batch.upNext) is already that.
  const trackingOrder =
    isBatch && leg === 'station'
      ? {
          customerName: focusView.customerName,
          customerPhone: focusView.customerPhone,
          cylinderSize: focusView.cylinderSize,
          amount: batch.stationOrders.reduce((sum, o) => sum + o.pricing.gasTotal, 0),
          tip: batch.stationOrders.reduce((sum, o) => sum + o.pricing.tip, 0),
          // The rider's commission for this station's orders (tip included), as each order's card shows it.
          earnings: batch.stationOrders.reduce(
            (sum, o) => sum + (o.estimatedEarnings ?? (o.riderCommission ?? 0) + o.pricing.tip),
            0
          ),
          cylinderCount: batch.stationOrders.length,
        }
      : focusView;

  const { headerTitle: singleHeaderTitle, steps, stage, showContactRow, buttonLabel } = PHASE_CONFIG[phase];
  const batchTotal = liveOrders.length;
  const headerTitle = !isBatch
    ? singleHeaderTitle
    : finished
      ? 'All deliveries done'
      : leg === 'pickup'
      ? `Collecting · ${batchTotal - pickupsLeft + 1} of ${batchTotal}`
      : leg === 'station'
        ? batch.stationIds.length > 1
          ? `Filling station ${batch.stationIds.length - batch.stationsLeft + 1} of ${batch.stationIds.length}`
          : 'Heading to filling station'
        : `Delivering · ${batchTotal - dropoffsLeft + 1} of ${batchTotal}`;
  const focusFlagged = !!flaggedIds[focusOrder.id];
  // Arrival opens a sheet for pickup/hand-over and starts filling at the
  // station (see the effects above), so there's no button while driving. It
  // appears only once the rider has arrived and dismissed that sheet ("Not
  // yet"), so they can still finish the stop.
  const canAct =
    arrived &&
    arrivalSheet === null &&
    (leg === 'dropoff'
      ? isBatch
        ? batch.delivering && batch.remaining.length > 0
        : !!single && single.status !== 'delivered'
      : leg === 'pickup' || isBatch);
  const primaryLabel = leg === 'pickup' ? 'Picked Up Cylinder' : leg === 'station' ? 'Start Filling' : isBatch ? 'Complete Delivery' : buttonLabel;
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
        vehicleType={vehicleType}
        stations={stationPins}
        customers={customerPins}
        target={targetPosition}
        referenceRoute={referenceRoute.coordinates}
        activeRoute={activeRouteCoords}
        routeColor={routeColor}
        onCustomerPress={(id) => setSelectedPinId((current) => (current === id ? null : id))}
        onMapPress={() => setSelectedPinId(null)}
        selectedCustomerId={selectedPinId}
        previewRoute={previewRoute.coordinates}
      />

      {selectedPin && (
        <View style={[styles.previewCard, { top: insets.top + 84 }]}>
          <View style={styles.previewDot} />
          <View style={styles.previewText}>
            <Text style={styles.previewName} numberOfLines={1}>
              Route to {selectedPin.name}
            </Text>
            <Text style={styles.previewMeta}>
              {previewDistanceKm !== null ? `${previewDistanceKm.toFixed(1)} km` : 'Finding route…'}
              {previewRoute.durationSeconds ? ` · about ${Math.max(1, Math.round(previewRoute.durationSeconds / 60))} min` : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.previewAction}
            onPress={() => setSelectedPinId(null)}
            accessibilityRole="button"
            accessibilityLabel="Close route preview"
          >
            <X size={16} color="rgba(0,0,0,0.6)" weight="bold" />
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <BackButton />
        {isBatch ? (
          <TouchableOpacity
            style={styles.headerTitleButton}
            onPress={() => setShowStops(true)}
            accessibilityRole="button"
            accessibilityLabel={`${headerTitle}. Show all customers`}
            hitSlop={8}
          >
            <Text style={styles.headerTitle}>{headerTitle}</Text>
            <View style={styles.headerCaret}>
              <CaretDown size={12} color="#000" weight="bold" />
            </View>
          </TouchableOpacity>
        ) : (
          <Text style={styles.headerTitle}>{headerTitle}</Text>
        )}
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
        {isBatch && leg !== 'pickup' ? (
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
            activeProgress={leg === 'pickup' ? legProgress : undefined}
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
            <Text style={styles.completeButtonText}>{primaryLabel}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ArrivalSheet
        visible={arrivalVisible}
        kind={arrivalSheet ?? 'pickup'}
        title={arrivalSheet === 'dropoff' ? 'Hand over the full cylinder' : 'Collect the empty cylinder'}
        subtitle={`${focusView.customerName} · ${focusView.dropoffAddress}`}
        details={[
          { label: 'Cylinders', value: `${focusView.cylinderCount} × ${focusView.cylinderSize}` },
          ...(arrivalSheet === 'dropoff'
            ? [
                focusOrder.paymentMethod === 'cash'
                  ? { label: 'Collect in cash', value: `₵ ${formatMinor(focusOrder.pricing.total)}` }
                  : { label: 'Payment', value: 'Paid online' },
              ]
            : [{ label: 'Next stop', value: isBatch && pickupsLeft > 1 ? 'Next customer' : stationName || 'Filling station' }]),
        ]}
        actionLabel={
          arrivalSheet === 'dropoff'
            ? focusOrder.paymentMethod === 'cash'
              ? 'Cash Collected'
              : 'Complete Delivery'
            : 'Picked Up'
        }
        onAction={arrivalSheet === 'dropoff' ? confirmDropoff : confirmPickup}
        onDismiss={() => setArrivalSheet(null)}
        // A mismatch at pickup (wrong size, wrong cylinder, no LPG): close this sheet, then
        // open the issue report. A flagged batch order is skipped and the ride moves on.
        onReport={
          arrivalSheet === 'pickup' && !focusFlagged
            ? () => {
                setArrivalSheet(null);
                afterModalCloses(() => setShowIssueModal(true));
              }
            : undefined
        }
        busy={busy}
      />

      <BatchCustomersSheet
        visible={showStops && focused}
        onClose={() => setShowStops(false)}
        mode={stopsMode}
        stops={batchStops}
        onShowRoute={(id) => {
          setShowStops(false);
          setSelectedPinId(id);
        }}
      />

      <ReportOrderIssueModal
        visible={showIssueModal}
        customerName={focusView.customerName}
        onCancel={() => setShowIssueModal(false)}
        onSubmit={handleReportIssue}
      />

      <CancelOrderModal
        visible={!!cancelTargetId}
        onCancel={handleCancelSheetClosed}
        onSubmit={handleCancelOrder}
      />

      <NextRideSheet
        visible={showNextSheet && !!nextOrder}
        order={nextOrder ? toOrderView(nextOrder, stations.data) : null}
        queueCount={queue.length}
        canRefer={nextOrder?.status === 'rider_assigned'}
        onStart={handleStartNext}
        onRefer={handleReferNext}
        // Dismissing leaves the finished delivery behind; Home lists the queue.
        onDismiss={() => {
          setShowNextSheet(false);
          router.replace('/home');
        }}
        busy={busy}
      />

      <NewOrderRequestModal
        visible={offerVisible}
        order={offerView}
        offerExpiresAt={offer ? offerExpiresAt(offer.id) : new Date().toISOString()}
        onAccept={handleAcceptOffer}
        onDecline={handleDeclineOffer}
        onDismiss={() => setOfferDismissed(true)}
        busy={acceptOffer.isPending || declineOffer.isPending}
        subtitle={
          singleRider
            ? 'Queue this order to start after your current delivery, or refer it to other riders.'
            : offerJoinsNextBatch
              ? 'This batch is already filled. Add the order to your next batch, or refer it to other riders.'
              : 'Add this pickup to your current run, or refer it to other riders.'
        }
        acceptLabel={singleRider ? 'Add to Queue' : offerJoinsNextBatch ? 'Add to Next Batch' : 'Add to Run'}
        declineLabel="Refer to Riders"
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
  headerTitleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerCaret: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
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
  previewCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: 18,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  previewDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7C3AED',
  },
  previewText: {
    flex: 1,
    gap: 2,
  },
  previewName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  previewMeta: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.55)',
  },
  previewAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backHomeText: {
    color: '#007AFF',
    fontWeight: '700',
    fontSize: 15,
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
