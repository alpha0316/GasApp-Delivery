import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { hasReducedPriority } from '../lib/orders/strikes';
import type { User } from '../lib/api/types';

interface RiderStatusBannerProps {
  rider: Pick<User, 'suspended' | 'strikeHistory'> | null | undefined;
}

// Section 3.3: a suspended rider can't accept new orders until an admin
// resolves it; a recent strike reduces assignment priority for 24h.
export default function RiderStatusBanner({ rider }: RiderStatusBannerProps) {
  if (!rider) return null;

  if (rider.suspended) {
    return (
      <View style={[styles.banner, styles.suspended]}>
        <Text style={styles.title}>Account suspended</Text>
        <Text style={styles.body}>
          Too many unexcused cancellations. Your account is pending review and you can&apos;t accept new orders until
          this is resolved.
        </Text>
      </View>
    );
  }

  if (hasReducedPriority(rider.strikeHistory)) {
    return (
      <View style={[styles.banner, styles.reduced]}>
        <Text style={styles.title}>Assignment priority reduced</Text>
        <Text style={styles.body}>A recent cancellation lowered your priority for new orders for 24 hours.</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 16,
    padding: 12,
    gap: 2,
  },
  suspended: {
    backgroundColor: '#FEF3F2',
    borderWidth: 1,
    borderColor: '#FECDCA',
  },
  reduced: {
    backgroundColor: '#FFFAEB',
    borderWidth: 1,
    borderColor: '#FEDF89',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
  body: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.6)',
  },
});
