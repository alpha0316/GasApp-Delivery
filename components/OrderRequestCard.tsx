import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Order } from '../types/order';
import { formatMinor } from '../lib/format/money';
import CylinderList from './CylinderList';
import {
  ClipboardTextIcon,
  BoxIcon,
  FuelPumpIcon,
  MapPinDuotoneIcon,
  DashedDivider,
  FlagIcon,
} from './icons/OrderCardIcons';

interface OrderRequestCardProps {
  order: Order;
  // ISO timestamp: the primary notification window (section 3.2) auto-declines
  // the offer once this passes. Omit it (e.g. for an order already in the
  // rider's queue) to show the card with no countdown.
  offerExpiresAt?: string;
  onAccept?: () => void;
  onDecline?: () => void;
  onViewLocation?: () => void;
  onFlag?: () => void;
  // While an accept/decline request is in flight: dims and disables both
  // buttons so a tap always gives visible feedback, even on a slow network.
  busy?: boolean;
  acceptDisabled?: boolean;
  // false hides the Decline/Accept row, for when a parent (e.g. the floating
  // sheet) shows those buttons itself.
  showActions?: boolean;
  // Seconds left on the offer, when a parent already runs the countdown. The
  // card then only displays it and leaves auto-decline to that parent.
  secondsLeft?: number;
}

export const secondsUntil = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));

// Ticks down to offerExpiresAt and calls onExpire once when it reaches 0.
// Pass no onExpire to only display the time.
export function useOfferCountdown(offerExpiresAt: string | undefined, onExpire?: () => void) {
  const [secondsLeft, setSecondsLeft] = useState(() => (offerExpiresAt ? secondsUntil(offerExpiresAt) : 0));
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!offerExpiresAt) return;
    expiredRef.current = false;
    setSecondsLeft(secondsUntil(offerExpiresAt));
    const interval = setInterval(() => {
      const remaining = secondsUntil(offerExpiresAt);
      setSecondsLeft(remaining);
      if (remaining <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [offerExpiresAt]);

  return secondsLeft;
}

export default function OrderRequestCard({
  order,
  offerExpiresAt,
  onAccept,
  onDecline,
  onViewLocation,
  onFlag,
  busy = false,
  acceptDisabled = false,
  showActions = true,
  secondsLeft: secondsLeftProp,
}: OrderRequestCardProps) {
  const ownSecondsLeft = useOfferCountdown(offerExpiresAt, secondsLeftProp === undefined ? onDecline : undefined);
  const secondsLeft = secondsLeftProp ?? ownSecondsLeft;
  const urgent = secondsLeft <= 10;
  // Once the countdown hits 0, decline fires, but disabling locally right
  // away (rather than waiting on that mutation + the pool refetch) closes
  // the window where a tap can still land on an order that's already gone.
  const hasCountdown = !!offerExpiresAt;
  const disabled = busy || (hasCountdown && secondsLeft <= 0);

  return (
    <View style={styles.outer}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.name}>{order.customerName}</Text>
          {!!order.customerPhone && <Text style={styles.phone}>{order.customerPhone}</Text>}
        </View>
        <View style={styles.headerRight}>
          {hasCountdown && (
            <View style={[styles.countdownPill, urgent && styles.countdownPillUrgent]}>
              <Text style={[styles.countdownText, urgent && styles.countdownTextUrgent]}>{secondsLeft}s</Text>
            </View>
          )}
          <Text style={styles.tip}>+ ₵ {formatMinor(order.earnings)}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <ClipboardTextIcon />
            <Text style={styles.orderLabel}>Order</Text>
          </View>
          <View style={styles.rowLeft}>
            <BoxIcon />
            <Text style={styles.cylinderCount}>
              {order.cylinders.length}{' '}
              <Text style={styles.cylinderCountMuted}>cylinder{order.cylinders.length > 1 ? 's' : ''}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.detailLeft}>
            <View style={styles.iconBox}>
              <FuelPumpIcon />
            </View>
            <View>
              <Text style={styles.detailLabel}>FILLING STATION</Text>
              <Text style={styles.detailValue}>{order.fillingStationName}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onViewLocation}>
            <Text style={styles.link}>View Location</Text>
          </TouchableOpacity>
        </View>

        <DashedDivider />

        <View style={styles.row}>
          <View style={styles.detailLeft}>
            <View style={styles.iconBox}>
              <MapPinDuotoneIcon />
            </View>
            <View>
              <Text style={styles.detailLabel}>DELIVER TO</Text>
              <Text style={styles.detailValue}>{order.dropoffAddress}</Text>
            </View>
          </View>
        </View>

        <DashedDivider />

        <CylinderList cylinders={order.cylinders} />

        {order.cylinders.length > 1 && (
          <View style={styles.row}>
            <Text style={styles.sizeLabel}>Total gas</Text>
            <Text style={styles.amount}>₵ {formatMinor(order.amount)}</Text>
          </View>
        )}

        {showActions && (
          <View style={styles.actionsRow}>
            {onFlag && (
              <TouchableOpacity style={styles.flagButton} onPress={onFlag}>
                <FlagIcon />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.declineButton, disabled && styles.buttonBusy]}
              onPress={onDecline}
              disabled={disabled}
            >
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptButton, (disabled || acceptDisabled) && styles.buttonBusy]}
              onPress={onAccept}
              disabled={disabled || acceptDisabled}
            >
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
    paddingTop: 12,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  headerLeft: {
    gap: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  phone: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.6)',
  },
  tip: {
    fontSize: 14,
    fontWeight: '500',
    color: '#34C759',
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  countdownPill: {
    backgroundColor: '#F4F4F4',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countdownPillUrgent: {
    backgroundColor: '#FEF3F2',
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.5)',
  },
  countdownTextUrgent: {
    color: '#B42318',
  },
  card: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    borderRadius: 24,
    padding: 8,
    gap: 12,
    shadowColor: 'rgba(12,12,13,0.15)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  orderLabel: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.4)',
  },
  cylinderCount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000',
  },
  cylinderCountMuted: {
    fontWeight: '400',
    color: 'rgba(0,0,0,0.5)',
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.5)',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000',
    marginTop: 2,
  },
  link: {
    fontSize: 14,
    color: '#0088FF',
    textDecorationLine: 'underline',
  },
  sizeLabel: {
    fontSize: 14,
    color: '#000',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonBusy: {
    opacity: 0.5,
  },
  flagButton: {
    width: 44,
    height: 44,
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(12,12,13,0.15)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 32,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(12,12,13,0.15)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  declineText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF383C',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#34C759',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 32,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(12,12,13,0.15)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  acceptText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
