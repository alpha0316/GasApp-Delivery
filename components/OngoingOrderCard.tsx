import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BoxIcon, ClipboardTextIcon, FuelPumpIcon, MapPinDuotoneIcon } from './icons/OrderCardIcons';
import { formatMinor } from '../lib/format/money';
import { Order } from '../types/order';

export type OngoingOrder = Pick<
  Order,
  'customerName' | 'customerPhone' | 'tip' | 'cylinderCount' | 'cylinderSize' | 'amount' | 'fillingStationName' | 'dropoffAddress'
>;

interface OngoingOrderCardProps {
  order: OngoingOrder;
  onReturn: () => void;
}

// The rider's current delivery, shown on the home screen - matches the
// design's "On Going Order!" card. Deliberately shows one order at a time:
// whatever the rider is working on right now, not an aggregate of the batch.
export default function OngoingOrderCard({ order, onReturn }: OngoingOrderCardProps) {
  return (
    <View style={styles.outer}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.name}>{order.customerName}</Text>
          {!!order.customerPhone && <Text style={styles.phone}>{order.customerPhone}</Text>}
        </View>
        <Text style={styles.tip}>+ ₵ {formatMinor(order.tip ?? 0)}</Text>
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
              {order.cylinderCount} <Text style={styles.cylinderCountMuted}>cylinder{order.cylinderCount > 1 ? 's' : ''}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.detailLeft}>
            <View style={styles.iconBox}>
              <FuelPumpIcon />
            </View>
            <View>
              <Text style={styles.detailLabel}>FILLING STATION</Text>
              <Text style={styles.detailValue}>{order.fillingStationName || '—'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

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

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.sizeLabel}>{order.cylinderSize} Size</Text>
          <Text style={styles.amount}>₵ {formatMinor(order.amount)}</Text>
        </View>

        <TouchableOpacity style={styles.returnButton} onPress={onReturn}>
          <Text style={styles.returnButtonText}>Return To On Going Delivery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: 'rgba(52,199,89,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(52,199,89,0.25)',
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
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  phone: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.6)',
    marginTop: 4,
  },
  tip: {
    fontSize: 14,
    fontWeight: '500',
    color: '#34C759',
  },
  card: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 8,
    gap: 10,
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
    color: 'rgba(255,255,255,0.7)',
  },
  cylinderCount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  cylinderCountMuted: {
    fontWeight: '400',
    color: 'rgba(255,255,255,0.65)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fff',
    marginTop: 2,
  },
  sizeLabel: {
    fontSize: 14,
    color: '#fff',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  returnButton: {
    backgroundColor: '#000',
    borderRadius: 32,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  returnButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
