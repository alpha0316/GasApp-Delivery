import React from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Coins, Star, Truck, Wallet } from 'phosphor-react-native';
import { errorMessage } from '../../../lib/api/client';
import { formatMinor } from '../../../lib/format/money';
import { useEarnings } from '../hooks';

export default function EarningsScreen() {
  const earnings = useEarnings();
  const totals = earnings.data;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={earnings.isRefetching} onRefresh={earnings.refetch} />}
      >
        <Text style={styles.title}>Earnings</Text>

        {earnings.isLoading && <ActivityIndicator style={{ marginTop: 32 }} />}
        {earnings.isError && <Text style={styles.errorText}>{errorMessage(earnings.error)}</Text>}

        {totals && (
          <>
            <View style={styles.heroCard}>
              <Wallet size={22} color="#fff" weight="fill" />
              <Text style={styles.heroLabel}>Total earned</Text>
              <Text style={styles.heroAmount}>
                ₵ {formatMinor(totals.totalEarned)} {totals.currency !== 'GHS' ? totals.currency : ''}
              </Text>
            </View>

            <View style={styles.row}>
              <View style={styles.statCard}>
                <Coins size={18} color="#000" weight="bold" />
                <Text style={styles.statLabel}>Pending payout</Text>
                <Text style={styles.statValue}>₵ {formatMinor(totals.payoutPending)}</Text>
              </View>
              <View style={styles.statCard}>
                <Coins size={18} color="#000" weight="bold" />
                <Text style={styles.statLabel}>Paid out</Text>
                <Text style={styles.statValue}>₵ {formatMinor(totals.payoutPaid)}</Text>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.statCard}>
                <Wallet size={18} color="#000" weight="bold" />
                <Text style={styles.statLabel}>Cash collected</Text>
                <Text style={styles.statValue}>₵ {formatMinor(totals.cashCollected)}</Text>
              </View>
              <View style={styles.statCard}>
                <Star size={18} color="#000" weight="fill" />
                <Text style={styles.statLabel}>Rating</Text>
                <Text style={styles.statValue}>{totals.rating !== null ? totals.rating.toFixed(1) : '—'}</Text>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.statCard}>
                <Truck size={18} color="#000" weight="bold" />
                <Text style={styles.statLabel}>Today&apos;s deliveries</Text>
                <Text style={styles.statValue}>{totals.todayDeliveries}</Text>
              </View>
              <View style={styles.statCard}>
                <Truck size={18} color="#000" weight="bold" />
                <Text style={styles.statLabel}>Total deliveries</Text>
                <Text style={styles.statValue}>{totals.totalDeliveries}</Text>
              </View>
            </View>
          </>
        )}
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
    marginTop: 8,
  },
  heroCard: {
    backgroundColor: '#000',
    borderRadius: 24,
    padding: 20,
    gap: 6,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  heroAmount: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#FAFAFA',
    padding: 16,
    gap: 6,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.5)',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
});
