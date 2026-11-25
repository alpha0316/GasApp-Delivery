import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { ArrowDownIcon, PhoneCallDuotoneIcon, WarningIcon } from './icons/OrderCardIcons';
import StatusTimeline from './StatusTimeline';
import { DeliveryStage, Order } from '../types/order';
import { formatMinor } from '../lib/format/money';
import Svg, { Path } from 'react-native-svg';

// The card also shows a batch, so it needs only these fields.
export type TrackingCardOrder = Pick<Order, 'customerName' | 'customerPhone' | 'cylinderSize' | 'amount' | 'earnings' | 'etaMinutes'>;

interface TrackingOrderCardProps {
  order: TrackingCardOrder;
  stage: DeliveryStage;
  steps?: DeliveryStage[];
  showContactRow?: boolean;
  activeProgress?: number;
  onReportIssue?: () => void;
}

export default function TrackingOrderCard({
  order,
  stage,
  steps,
  showContactRow = false,
  activeProgress,
  onReportIssue,
}: TrackingOrderCardProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <View style={styles.outer}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => Linking.openURL(`tel:${order.customerPhone}`)}>
          <Text style={styles.name}>{order.customerName}</Text>
          <Text style={styles.phone}>{order.customerPhone}</Text>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <Text style={styles.tip}>+ ₵ {formatMinor(order.earnings)}</Text>
          {onReportIssue && (
            <TouchableOpacity style={styles.issueButton} onPress={onReportIssue}>
              <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <Path opacity="0.2" d="M22.5 9.75L5.25 15.75V3.75L22.5 9.75Z" fill="#FF9500" />
                <Path d="M22.7466 9.04169L5.49656 3.04169C5.3835 3.00233 5.26266 2.99061 5.14415 3.00751C5.02563 3.0244 4.91288 3.06943 4.81532 3.13881C4.71777 3.20819 4.63823 3.29992 4.58338 3.40632C4.52852 3.51273 4.49993 3.63072 4.5 3.75044V20.2504C4.5 20.4494 4.57902 20.6401 4.71967 20.7808C4.86032 20.9214 5.05109 21.0004 5.25 21.0004C5.44891 21.0004 5.63968 20.9214 5.78033 20.7808C5.92098 20.6401 6 20.4494 6 20.2504V16.2839L22.7466 10.4592C22.8939 10.4082 23.0217 10.3125 23.1122 10.1855C23.2026 10.0585 23.2513 9.90638 23.2513 9.75044C23.2513 9.59449 23.2026 9.44242 23.1122 9.3154C23.0217 9.18837 22.8939 9.09269 22.7466 9.04169ZM6 14.6958V4.80512L20.2172 9.75044L6 14.6958Z" fill="#FF9500" />
              </Svg>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setExpanded((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Collapse order details' : 'Expand order details'}
            style={!expanded && styles.collapseArrowFlipped}
          >
            <ArrowDownIcon color="#fff" opacity={0.8} />
          </TouchableOpacity>
        </View>
      </View>

      {expanded && (
        <View style={styles.card}>
          <View style={styles.sizeRow}>
            <View style={styles.sizeLeft}>
              <View style={styles.cylinderIconBox}>
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

          <StatusTimeline
            stage={stage}
            etaMinutes={order.etaMinutes ?? 5}
            steps={steps}
            activeProgress={activeProgress}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    borderRadius: 24,
    paddingTop: 12,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  phone: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
  tip: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  issueButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    // borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapseArrowFlipped: {
    transform: [{ rotate: '180deg' }],
  },
  card: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    borderRadius: 24,
    padding: 16,
    gap: 12,
    width: '100%',
    shadowColor: 'rgba(12,12,13,0.15)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  sizeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cylinderIconBox: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cylinderImage: {
    width: 10,
    height: 16,
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
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: 44,
    width: '100%',
  },
  callButton: {
    backgroundColor: '#F4F4F4',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
