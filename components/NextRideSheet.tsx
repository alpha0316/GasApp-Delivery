import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { ArrowsCounterClockwise } from 'phosphor-react-native';
import FloatingSheet, { SheetButton } from './FloatingSheet';
import { DashedDivider, FuelPumpIcon, MapPinDuotoneIcon } from './icons/OrderCardIcons';
import { formatMinor } from '../lib/format/money';
import { Order } from '../types/order';

export type NextRide = Pick<
  Order,
  'customerName' | 'cylinderCount' | 'cylinderSize' | 'amount' | 'earnings' | 'fillingStationName' | 'dropoffAddress'
>;

interface NextRideSheetProps {
  visible: boolean;
  order: NextRide | null;
  // How many orders are waiting in total, including `order`.
  queueCount: number;
  // An order can only be referred back to the pool before pickup.
  canRefer: boolean;
  onStart: () => void;
  onRefer: () => void;
  // Backdrop tap / Android back. The order stays queued either way.
  onDismiss: () => void;
  busy?: boolean;
}

// Shown after a delivery is completed while more orders are queued: the
// rider either starts the next one or hands it to other active riders.
export default function NextRideSheet({
  visible,
  order,
  queueCount,
  canRefer,
  onStart,
  onRefer,
  onDismiss,
  busy = false,
}: NextRideSheetProps) {
  if (!order) return null;
  const moreAfter = queueCount - 1;

  return (
    <FloatingSheet
      visible={visible}
      onClose={onDismiss}
      footer={
        <>
          <SheetButton
            title="Refer to riders"
            variant="destructive"
            onPress={onRefer}
            disabled={busy || !canRefer}
            icon={<ArrowsCounterClockwise size={16} color="#FF383C" weight="bold" />}
          />
          <SheetButton title="Start next ride" variant="success" onPress={onStart} disabled={busy} />
        </>
      }
    >
      <View style={styles.titleGroup}>
        <Text style={styles.title}>Next ride is ready</Text>
        <Text style={styles.subtitle}>
          You have {queueCount} order{queueCount === 1 ? '' : 's'} in your queue. Start the next one now, or refer it
          to other active riders.
        </Text>
      </View>

      <View style={styles.cardWrap}>
        <View style={styles.outer}>
          <View style={styles.headerRow}>
            <Text style={styles.name} numberOfLines={1}>
              {order.customerName}
            </Text>
            <Text style={styles.earnings}>+ ₵ {formatMinor(order.earnings)}</Text>
          </View>

          <View style={styles.card}>
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
                <MapPinDuotoneIcon />
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
                <Text style={styles.sizeLabel}>
                  {order.cylinderCount > 1 ? `${order.cylinderCount} × ` : ''}
                  {order.cylinderSize} Size
                </Text>
              </View>
              <Text style={styles.amount}>₵ {formatMinor(order.amount)}</Text>
            </View>
          </View>
        </View>

        {moreAfter > 0 && (
          <Text style={styles.queueNote}>
            +{moreAfter} more order{moreAfter === 1 ? '' : 's'} after this one
          </Text>
        )}
        {!canRefer && (
          <Text style={styles.queueNote}>This order is already picked up, so it can&apos;t be referred.</Text>
        )}
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
    gap: 8,
  },
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
    gap: 12,
  },
  name: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  earnings: {
    fontSize: 14,
    fontWeight: '500',
    color: '#34C759',
  },
  card: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
    padding: 8,
    gap: 12,
    shadowColor: 'rgba(12,12,13,0.15)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  iconBox: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cylinderBox: {
    width: 32,
    height: 32,
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
    color: 'rgba(0,0,0,0.5)',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000',
    marginTop: 2,
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
  queueNote: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.5)',
    textAlign: 'center',
  },
});
