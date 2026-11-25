import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BoxIcon, ClipboardTextIcon, DashedDivider, FuelPumpIcon, MapPinDuotoneIcon } from './icons/OrderCardIcons';
import { formatMinor } from '../lib/format/money';
import { Order } from '../types/order';

export type OngoingOrder = Pick<
  Order,
  'customerName' | 'customerPhone' | 'earnings' | 'cylinderCount' | 'cylinderSize' | 'amount' | 'fillingStationName' | 'dropoffAddress'
>;

interface OngoingOrderCardProps {
  order: OngoingOrder;
  onReturn: () => void;
}

const GREEN = '#34C759';

// The rider's current delivery, shown on the home screen - matches the
// design's "On Going Order!" card. Deliberately shows one order at a time:
// whatever the rider is working on right now, not an aggregate of the batch.
export default function OngoingOrderCard({ order, onReturn }: OngoingOrderCardProps) {
  return (
    <View style={styles.outer}>
      <View style={styles.headerRow}>
        <View style={styles.contact}>
          <Text style={styles.name} numberOfLines={1}>
            {order.customerName}
          </Text>
          {!!order.customerPhone && <Text style={styles.phone}>{order.customerPhone}</Text>}
        </View>
        <Text style={styles.tip}>+ ₵ {formatMinor(order.earnings)}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <ClipboardTextIcon color="white" opacity={0.8} />
            <Text style={styles.orderLabel}>Order</Text>
          </View>
          <View style={[styles.summaryItem, styles.cylinderItem]}>
            <BoxIcon color="white" opacity={0.7} />
            <Text style={styles.cylinderCount}>
              {order.cylinderCount}{' '}
              <Text style={styles.cylinderCountMuted}>cylinder{order.cylinderCount === 1 ? '' : 's'}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.iconBox}>
            <FuelPumpIcon />
          </View>
          <View style={styles.detailText}>
            <Text style={styles.detailLabel}>Filling station</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {order.fillingStationName || '—'}
            </Text>
          </View>
        </View>

        <DashedDivider />

        <View style={styles.detailRow}>
          <View style={styles.iconBox}>
            <MapPinDuotoneIcon color="white" />
          </View>
          <View style={styles.detailText}>
            <Text style={styles.detailLabel}>Deliver to</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {order.dropoffAddress}
            </Text>
          </View>
        </View>

        <DashedDivider />

        <View style={styles.sizeRow}>
          <View style={styles.detailRow}>
            <View style={[styles.iconBox, styles.cylinderBox]}>
              <Image
                source={require('../assets/images/order-card/cylinder.png')}
                style={styles.cylinderImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.sizeLabel}>{order.cylinderSize} Size</Text>
          </View>
          <Text style={styles.amount}>₵ {formatMinor(order.amount)}</Text>
        </View>

        <TouchableOpacity style={styles.returnButton} onPress={onReturn} accessibilityRole="button">
          <Text style={styles.returnButtonText}>Return To On Going Delivery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: '#E6FFE3',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 24,
    overflow: 'hidden',
    paddingTop: 12,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    gap: 12,
  },
  contact: {
    flexShrink: 1,
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
    color: GREEN,
  },
  card: {
    backgroundColor: GREEN,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 24,
    padding: 8,
    gap: 12,
    shadowColor: 'rgb(12,12,13)',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cylinderItem: {
    gap: 4,
  },
  orderLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  cylinderCount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  cylinderCountMuted: {
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  iconBox: {
    backgroundColor: 'rgba(250,250,250,0.1)',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cylinderBox: {
    width: 32,
  },
  cylinderImage: {
    width: 10,
    height: 16,
  },
  detailText: {
    flexShrink: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fff',
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 32,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgb(12,12,13)',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  returnButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
});
