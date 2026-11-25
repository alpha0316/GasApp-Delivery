import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { formatMinor } from '../lib/format/money';
import type { CylinderLine } from '../types/order';

interface CylinderListProps {
  cylinders: CylinderLine[];
}

// Every cylinder in an order, one row each, matching the customer app's
// cylinder picker: the cylinder tile and its size on the left, and where the
// customer's quantity stepper sits, the amount of gas to fill it with. Two
// small cylinders are two rows, each with its own amount.
export default function CylinderList({ cylinders }: CylinderListProps) {
  return (
    <View style={styles.list}>
      {cylinders.map((cylinder, index) => (
        <View key={index} style={styles.row} accessibilityLabel={`${cylinder.size} cylinder, fill ₵ ${formatMinor(cylinder.amount)}`}>
          <View style={styles.tile}>
            <Image source={require('../assets/images/order-card/cylinder.png')} style={styles.image} resizeMode="contain" />
          </View>
          <Text style={styles.size}>{cylinder.size} Size</Text>
          <View style={styles.amountPill}>
            <Text style={styles.amount}>₵ {formatMinor(cylinder.amount)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tile: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 16,
    height: 26,
  },
  size: {
    flex: 1,
    fontSize: 15,
    color: '#000',
  },
  amountPill: {
    minWidth: 96,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F4F4F4',
    alignItems: 'center',
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
});
