import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import BackButton from '../../../components/BackButton';
import { showToast } from '../../../components/Toast';
import { errorMessage } from '../../../lib/api/client';
import { formatMinor } from '../../../lib/format/money';
import { useAdvanceOrder, useFlaggedIds, useRiderOrders } from '../../orders/hooks';
import { deriveBatch } from '../batch';

export default function FillingProcessBatchScreen() {
  const router = useRouter();
  // orderIds: just this station's orders. A batch whose customers picked
  // different stations comes here once per station.
  const {
    orderIds = '',
    stationName = '',
    moreStations = '0',
  } = useLocalSearchParams<{ orderIds?: string; stationName?: string; moreStations?: string }>();
  const stationsAfterThis = Number(moreStations) || 0;
  const ordersQuery = useRiderOrders();
  const advance = useAdvanceOrder();
  const flaggedIds = useFlaggedIds();
  const [filledCount, setFilledCount] = useState(0);
  const [completing, setCompleting] = useState(false);

  const sessionIds = useMemo(() => orderIds.split(',').filter(Boolean), [orderIds]);
  const batch = useMemo(
    () =>
      deriveBatch(
        sessionIds
          .map((id) => (ordersQuery.data ?? []).find((o) => o.id === id))
          .filter((o): o is NonNullable<typeof o> => o !== undefined),
        flaggedIds
      ),
    [sessionIds, ordersQuery.data, flaggedIds]
  );
  const orders = batch.queue.filter((o) => o.status !== 'delivered' && o.status !== 'flagged');

  // The rider fills one cylinder at a time, so progress counts cylinders: a
  // customer with 2 small cylinders and a medium one is 3 steps.
  const lines = orders.flatMap((order) => order.cylinders.map((cylinder) => ({ orderId: order.id, ...cylinder })));
  const totalAmount = lines.reduce((sum, l) => sum + l.amount, 0);
  const filledAmount = lines.slice(0, filledCount).reduce((sum, l) => sum + l.amount, 0);
  const amountLeft = totalAmount - filledAmount;
  const leftToFill = lines.length - filledCount;
  const isLast = filledCount === lines.length - 1;

  const completeFilling = async () => {
    setCompleting(true);
    try {
      for (const order of batch.remaining) {
        if (order.status !== 'en_route_to_customer') {
          await advance.mutateAsync({ order, target: 'en_route_to_customer' });
        }
      }
      if (stationsAfterThis > 0) {
        showToast(`Filled at ${stationName || 'this station'}`, {
          tone: 'success',
          message: `${stationsAfterThis} more station${stationsAfterThis === 1 ? '' : 's'} before deliveries`,
        });
      } else {
        showToast('All cylinders filled', {
          tone: 'success',
          message: `${lines.length} cylinder${lines.length === 1 ? '' : 's'} for ${orders.length} customer${orders.length === 1 ? '' : 's'}`,
        });
      }
      // Back to the tracking screen this was opened from (still mounted
      // underneath) rather than stacking a second copy of it.
      if (router.canGoBack()) router.back();
      else router.replace({ pathname: '/tracking', params: { orderIds } });
    } catch (error) {
      Alert.alert('Error', errorMessage(error));
    } finally {
      setCompleting(false);
    }
  };

  const handleNext = () => {
    if (filledCount >= lines.length - 1) {
      void completeFilling();
      return;
    }
    setFilledCount((prev) => prev + 1);
  };

  return (
    <SafeAreaView style={styles.main} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <BackButton />
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Filling Process</Text>
          {!!stationName && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {stationName}
              {stationsAfterThis > 0 ? ` · ${stationsAfterThis} more after this` : ''}
            </Text>
          )}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Cylinders</Text>
          <Text style={styles.statValue}>{lines.length}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Left To Fill</Text>
          <Text style={[styles.statValue, styles.statValueBlue]}>{leftToFill}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Amount Left</Text>
          <Text style={[styles.statValue, styles.statValueRed]}>GHS {formatMinor(amountLeft)}</Text>
        </View>
      </View>

      <ScrollView style={styles.tableScroll} contentContainerStyle={styles.table}>
        {(() => {
          let lineIndex = 0;
          return orders.map((order, orderIndex) => {
            const first = lineIndex;
            lineIndex += order.cylinders.length;
            const stateOf = (i: number) => ({ filled: i < filledCount, active: i === filledCount });

            // One cylinder: a single row, as before.
            if (order.cylinders.length === 1) {
              const { filled, active } = stateOf(first);
              const cylinder = order.cylinders[0];
              return (
                <View
                  key={order.id}
                  style={[styles.tableRow, filled && styles.tableRowDimmed, active && styles.tableRowActive]}
                >
                  <Text style={styles.cellIndex}>{orderIndex + 1}</Text>
                  <Text style={styles.cellName} numberOfLines={1}>
                    {order.customerName}
                  </Text>
                  <Text style={styles.cellMeta} numberOfLines={1}>
                    {order.area}
                  </Text>
                  <Text style={styles.cellMeta}>{cylinder.size}</Text>
                  <Text style={[styles.cellAmount, filled && styles.cellAmountStruck]}>GHS {formatMinor(cylinder.amount)}</Text>
                </View>
              );
            }

            // Several cylinders (same or different sizes and amounts): the
            // customer once, then one line per cylinder, filled one at a time.
            const groupActive = filledCount >= first && filledCount < lineIndex;
            const groupDone = filledCount >= lineIndex;
            return (
              <View
                key={order.id}
                style={[styles.group, groupDone && styles.tableRowDimmed, groupActive && styles.tableRowActive]}
              >
                <View style={styles.groupHeader}>
                  <Text style={styles.cellIndex}>{orderIndex + 1}</Text>
                  <Text style={styles.cellName} numberOfLines={1}>
                    {order.customerName}
                  </Text>
                  <Text style={styles.cellMeta} numberOfLines={1}>
                    {order.area}
                  </Text>
                  <Text style={styles.groupCount}>{order.cylinders.length} cylinders</Text>
                </View>
                {order.cylinders.map((cylinder, i) => {
                  const { filled, active } = stateOf(first + i);
                  return (
                    <View key={i} style={[styles.subRow, active && styles.subRowActive]}>
                      <View style={[styles.subDot, filled && styles.subDotFilled, active && styles.subDotActive]} />
                      <Text style={[styles.subSize, filled && styles.subTextFilled]}>{cylinder.size} Size</Text>
                      <Text style={[styles.cellAmount, filled && styles.cellAmountStruck]}>GHS {formatMinor(cylinder.amount)}</Text>
                    </View>
                  );
                })}
              </View>
            );
          });
        })()}
      </ScrollView>

      <TouchableOpacity
        style={[styles.nextButton, (completing || lines.length === 0) && styles.nextButtonDisabled]}
        onPress={handleNext}
        disabled={completing || lines.length === 0}
      >
        <Text style={styles.nextButtonText}>
          {isLast ? (stationsAfterThis > 0 ? 'Done, Next Station' : 'Complete Filling') : 'Next'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerSpacer: {
    width: 36,
  },
  headerTitleGroup: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.55)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    padding: 12,
    gap: 16,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.6)',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  statValueBlue: {
    color: '#0085FF',
  },
  statValueRed: {
    color: '#FF383C',
  },
  tableScroll: {
    marginTop: 24,
    flexGrow: 0,
  },
  group: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 6,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 4,
  },
  groupCount: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.5)',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingLeft: 22,
    paddingRight: 4,
    borderRadius: 8,
  },
  subRowActive: {
    backgroundColor: '#EFF8FF',
  },
  subDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  subDotFilled: {
    backgroundColor: '#FF383C',
    borderColor: '#FF383C',
  },
  subDotActive: {
    borderColor: '#0085FF',
  },
  subSize: {
    flex: 1,
    fontSize: 13,
    color: '#000',
  },
  subTextFilled: {
    color: 'rgba(0,0,0,0.4)',
  },
  table: {
    backgroundColor: '#F4F4F4',
    borderRadius: 12,
    padding: 8,
    gap: 8,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  tableRowDimmed: {
    opacity: 0.3,
  },
  tableRowActive: {
    borderColor: '#0085FF',
    borderWidth: 1.5,
  },
  cellIndex: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.4)',
    width: 14,
  },
  cellName: {
    flex: 1.3,
    fontSize: 13,
    color: '#000',
  },
  cellMeta: {
    flex: 1,
    fontSize: 13,
    color: '#000',
  },
  cellAmount: {
    fontSize: 13,
    color: '#000',
    fontWeight: '600',
  },
  cellAmountStruck: {
    color: '#FF383C',
    textDecorationLine: 'line-through',
  },
  nextButton: {
    marginTop: 'auto',
    marginBottom: 32,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
