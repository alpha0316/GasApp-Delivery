import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArrowsCounterClockwise, ArrowSquareOut, DotsSixVertical } from 'phosphor-react-native';
import { QueueOrder } from '../types/order';
import { formatMinor } from '../lib/format/money';
import { formatClock } from '../features/orders/mappers';

interface ActiveQueueOrderCardProps {
  index: number;
  order: QueueOrder;
  // null while the rider's position or the order's distance isn't known yet.
  distanceKm: number | null;
  // A queued order can only be referred back to the pool before pickup -
  // mirrors the backend's cancel-before-pickup rule (section 2.1, step 8).
  canRefer: boolean;
  onRefer: () => void;
  onViewOrder: () => void;
}

export default function ActiveQueueOrderCard({
  index,
  order,
  distanceKm,
  canRefer,
  onRefer,
  onViewOrder,
}: ActiveQueueOrderCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.indexBadge}>
          <Text style={styles.indexText}>{index}</Text>
        </View>
        <DotsSixVertical size={16} color="rgba(0,0,0,0.3)" />
        <View style={styles.customer}>
          <Text style={styles.name}>{order.customerName}</Text>
          {!!order.customerPhone && <Text style={styles.phone}>{order.customerPhone}</Text>}
        </View>
        <Text style={styles.earning}>+ ₵ {formatMinor(order.tip ?? 0)}</Text>
      </View>

      <View style={styles.locs}>
        <View style={styles.locRow}>
          <View style={[styles.locDot, styles.locDotStation]} />
          <Text style={styles.locText}>
            <Text style={styles.locName}>{order.stationName || 'Filling station'}</Text>
          </Text>
        </View>
        <View style={styles.locRow}>
          <View style={[styles.locDot, styles.locDotDeliver]} />
          <Text style={styles.locText} numberOfLines={1}>
            <Text style={styles.locName}>{order.area}</Text>
          </Text>
        </View>
      </View>

      <View style={styles.chipsRow}>
        {distanceKm !== null && (
          <View style={[styles.chip, styles.chipDist]}>
            <Text style={styles.chipDistText}>📍 {distanceKm.toFixed(1)} km</Text>
          </View>
        )}
        <View style={styles.chip}>
          <Text style={styles.chipText}>{formatClock(new Date(order.createdAt))}</Text>
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipText}>
            {order.cylinderSize} cylinder · ₵ {formatMinor(order.amount)}
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.referButton}
          onPress={onRefer}
          disabled={!canRefer}
          accessibilityRole="button"
          accessibilityLabel="Refer to riders"
        >
          <ArrowsCounterClockwise size={13} color={canRefer ? '#B42318' : 'rgba(180,35,24,0.3)'} weight="bold" />
          <Text style={[styles.referText, !canRefer && styles.referTextDisabled]}>Refer to riders</Text>
        </TouchableOpacity>
        <View style={styles.actionsDivider} />
        <TouchableOpacity
          style={styles.viewButton}
          onPress={onViewOrder}
          accessibilityRole="button"
          accessibilityLabel="View order"
        >
          <ArrowSquareOut size={13} color="#0088FF" weight="bold" />
          <Text style={styles.viewText}>View Order</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  indexBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  indexText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.5)',
  },
  customer: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000',
  },
  phone: {
    fontSize: 11,
    color: 'rgba(0,0,0,0.5)',
    marginTop: 2,
  },
  earning: {
    fontSize: 13,
    fontWeight: '500',
    color: '#34C759',
    flexShrink: 0,
  },
  locs: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 6,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  locDotStation: {
    backgroundColor: '#0088FF',
  },
  locDotDeliver: {
    backgroundColor: '#34C759',
  },
  locText: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.5)',
    flexShrink: 1,
  },
  locName: {
    fontWeight: '500',
    color: '#000',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  chip: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#fff',
  },
  chipText: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(0,0,0,0.5)',
  },
  chipDist: {
    backgroundColor: 'rgba(0,136,255,0.06)',
    borderColor: 'rgba(0,136,255,0.2)',
  },
  chipDistText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#0088FF',
  },
  actionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  referButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
  },
  referText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#B42318',
  },
  referTextDisabled: {
    color: 'rgba(180,35,24,0.3)',
  },
  actionsDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
  },
  viewText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0088FF',
  },
});
