import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Phone } from 'phosphor-react-native';
import FloatingSheet, { SheetButton } from './FloatingSheet';
import OrderRequestCard from './OrderRequestCard';
import { Order } from '../types/order';

interface QueuedOrderSheetProps {
  // null hides the sheet.
  order: Order | null;
  // A queued order can only be referred back to the pool before pickup.
  canRefer: boolean;
  onRefer: () => void;
  onClose: () => void;
}

// "View Order" from the Home queue: the full order card (the same one used
// for incoming requests, minus the countdown) in a floating sheet.
export default function QueuedOrderSheet({ order, canRefer, onRefer, onClose }: QueuedOrderSheetProps) {
  if (!order) return null;

  return (
    <FloatingSheet
      visible
      onClose={onClose}
      footer={
        <>
          {canRefer ? (
            <SheetButton title="Refer To Riders" variant="destructive" onPress={onRefer} />
          ) : (
            <SheetButton title="Close" variant="secondary" onPress={onClose} />
          )}
          {!!order.customerPhone && (
            <SheetButton
              title="Call Customer"
              variant="success"
              onPress={() => void Linking.openURL(`tel:${order.customerPhone}`)}
              icon={<Phone size={16} color="#fff" weight="fill" />}
            />
          )}
        </>
      }
    >
      <View style={styles.titleGroup}>
        <Text style={styles.title}>Order Details</Text>
        <Text style={styles.subtitle}>This order is waiting in your queue.</Text>
      </View>

      <View style={styles.cardWrap}>
        <OrderRequestCard order={order} showActions={false} />
      </View>
    </FloatingSheet>
  );
}

const styles = StyleSheet.create({
  titleGroup: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.6)',
    textAlign: 'center',
  },
  cardWrap: {
    alignSelf: 'stretch',
    paddingHorizontal: 16,
  },
});
