import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { OrderStatus } from '../lib/api/types';
import { formatMinor } from '../lib/format/money';
import type { Order } from '../types/order';

const STATUS_STYLES: Record<OrderStatus, { bg: string; text: string; label: string }> = {
  pending_payment: { bg: '#F4F4F4', text: 'rgba(0,0,0,0.5)', label: 'Pending payment' },
  awaiting_rider: { bg: '#F4F4F4', text: 'rgba(0,0,0,0.5)', label: 'Awaiting rider' },
  rider_assigned: { bg: '#FFF4E5', text: '#B54708', label: 'Pending' },
  picked_up: { bg: '#EFF8FF', text: '#175CD3', label: 'Picked up' },
  filling: { bg: '#EFF8FF', text: '#175CD3', label: 'Filling' },
  en_route_to_customer: { bg: '#EFF8FF', text: '#175CD3', label: 'On the way' },
  delivered: { bg: '#ECFDF3', text: '#067647', label: 'Delivered' },
  cancelled: { bg: '#FEF3F2', text: '#B42318', label: 'Cancelled' },
  refunded: { bg: '#FEF3F2', text: '#B42318', label: 'Refunded' },
};

interface OrderHistoryRowProps {
  order: Order;
  onPress?: () => void;
}

export default function OrderHistoryRow({ order, onPress }: OrderHistoryRowProps) {
  const badge = STATUS_STYLES[order.status];
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper style={styles.row} onPress={onPress} {...(onPress ? { accessibilityRole: 'button' as const } : {})}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {order.customerName}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {order.dropoffAddress} · {order.cylinderSize}
        </Text>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
        </View>
      </View>
      <View style={styles.amountCol}>
        <Text style={styles.amount}>₵ {formatMinor(order.earnings)}</Text>
        {order.tip ? <Text style={styles.tip}>+ ₵ {formatMinor(order.tip)} tip</Text> : null}
        {order.platformFeeLocked && <Text style={styles.lockedText}>Fee locked</Text>}
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
  },
  meta: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.5)',
    marginTop: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
  },
  tip: {
    fontSize: 11,
    color: '#34C759',
    marginTop: 2,
  },
  lockedText: {
    fontSize: 11,
    color: '#B54708',
    marginTop: 2,
  },
});
