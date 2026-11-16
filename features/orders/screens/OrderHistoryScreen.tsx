import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import OrderHistoryRow from '../../../components/OrderHistoryRow';
import SegmentedTabs from '../../../components/SegmentedTabs';
import { errorMessage } from '../../../lib/api/client';
import { useRiderOrders, useStations } from '../hooks';
import { toOrderView } from '../mappers';
import { historyBucket, isActiveStatus, type HistoryBucket } from '../flow';

const TABS: { value: HistoryBucket; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
];

export default function OrderHistoryScreen() {
  const router = useRouter();
  const orders = useRiderOrders();
  const stations = useStations();
  const [bucket, setBucket] = useState<HistoryBucket>('pending');

  const grouped = useMemo(() => {
    const views = (orders.data ?? []).map((order) => ({ raw: order, view: toOrderView(order, stations.data) }));
    return {
      pending: views.filter((o) => historyBucket(o.raw.status) === 'pending'),
      ongoing: views.filter((o) => historyBucket(o.raw.status) === 'ongoing'),
      completed: views.filter((o) => historyBucket(o.raw.status) === 'completed'),
    };
  }, [orders.data, stations.data]);

  const rows = grouped[bucket];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Orders</Text>

        <SegmentedTabs options={TABS} value={bucket} onChange={setBucket} />

        {orders.isLoading && <ActivityIndicator style={{ marginTop: 32 }} />}
        {orders.isError && <Text style={styles.errorText}>{errorMessage(orders.error)}</Text>}

        {!orders.isLoading && rows.length === 0 && <Text style={styles.emptyText}>No {bucket} orders.</Text>}

        <View>
          {rows.map(({ raw, view }) => (
            <OrderHistoryRow
              key={raw.id}
              order={view}
              onPress={isActiveStatus(raw.status) ? () => router.push({ pathname: '/tracking', params: { orderId: raw.id } }) : undefined}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  errorText: {
    color: '#B42318',
    fontSize: 13,
  },
  emptyText: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.5)',
    textAlign: 'center',
    marginTop: 24,
  },
});
