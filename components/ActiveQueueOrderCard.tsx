import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArrowSquareOut, CaretDown, Phone } from 'phosphor-react-native';
import { BoxIcon, ClipboardTextIcon, MapPinDuotoneIcon } from './icons/OrderCardIcons';
import { formatMinor } from '../lib/format/money';
import { Order } from '../types/order';

export type QueuedOrder = Pick<
  Order,
  'customerName' | 'customerPhone' | 'tip' | 'cylinderCount' | 'cylinderSize' | 'amount' | 'dropoffAddress'
>;

interface ActiveQueueOrderCardProps {
  order: QueuedOrder;
  // A queued order can only be referred back to the pool before pickup -
  // mirrors the backend's cancel-before-pickup rule (section 2.1, step 8).
  canRefer: boolean;
  onRefer: () => void;
  onViewOrder: () => void;
}

// One order waiting in the rider's active queue on Home. The header toggles
// the details; "View Order" opens the full card in a sheet.
export default function ActiveQueueOrderCard({ order, canRefer, onRefer, onViewOrder }: ActiveQueueOrderCardProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <View style={styles.outer}>
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => setExpanded((open) => !open)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${order.customerName}'s order`}
      >
        <View style={styles.contact}>
          <Text style={styles.name} numberOfLines={1}>
            {order.customerName}
          </Text>
          {!!order.customerPhone && <Text style={styles.phone}>{order.customerPhone}</Text>}
        </View>
        <Text style={styles.tip}>+ ₵ {formatMinor(order.tip ?? 0)}</Text>
        <View style={!expanded && styles.caretCollapsed}>
          <CaretDown size={18} color="rgba(0,0,0,0.6)" />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <ClipboardTextIcon />
              <Text style={styles.orderLabel}>Order</Text>
            </View>
            <View style={[styles.summaryItem, styles.cylinderItem]}>
              <BoxIcon />
              <Text style={styles.cylinderCount}>
                {order.cylinderCount}{' '}
                <Text style={styles.cylinderCountMuted}>cylinder{order.cylinderCount === 1 ? '' : 's'}</Text>
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.address}>
              <MapPinDuotoneIcon />
              <Text style={styles.addressText} numberOfLines={1}>
                {order.dropoffAddress}
              </Text>
            </View>
            <View style={styles.dot} />
            <View style={styles.size}>
              <Image
                source={require('../assets/images/order-card/cylinder.png')}
                style={styles.cylinderImage}
                resizeMode="contain"
              />
              <Text style={styles.sizeText}>{order.cylinderSize} Size</Text>
              <Text style={styles.amount}>₵ {formatMinor(order.amount)}</Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.referButton, !canRefer && styles.buttonDisabled]}
              onPress={onRefer}
              disabled={!canRefer}
              accessibilityRole="button"
              accessibilityLabel="Refer to other riders"
              accessibilityState={{ disabled: !canRefer }}
            >
              <Phone size={18} color="#FF8D28" weight="fill" />
              <Text style={styles.referText}>Refer To Other Riders</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.viewButton}
              onPress={onViewOrder}
              accessibilityRole="button"
              accessibilityLabel="View order"
            >
              <ArrowSquareOut size={18} color="#0088FF" weight="bold" />
              <Text style={styles.viewText}>View Order</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
    overflow: 'hidden',
    paddingTop: 12,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  contact: {
    flex: 1,
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
  caretCollapsed: {
    transform: [{ rotate: '-90deg' }],
  },
  card: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
    padding: 8,
    gap: 14,
    shadowColor: 'rgba(12,12,13,0.15)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
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
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  address: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  addressText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#000',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  size: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cylinderImage: {
    width: 10,
    height: 16,
  },
  sizeText: {
    fontSize: 13,
    color: '#000',
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  referButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,141,40,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,141,40,0.25)',
    borderRadius: 32,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  referText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF8D28',
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 32,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  viewText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0088FF',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});
