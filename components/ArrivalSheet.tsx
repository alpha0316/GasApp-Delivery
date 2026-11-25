import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Flag, MapPin, Package, GasPump } from 'phosphor-react-native';
import FloatingSheet, { SheetButton } from './FloatingSheet';

export type ArrivalKind = 'pickup' | 'dropoff' | 'station';

interface ArrivalSheetProps {
  visible: boolean;
  kind: ArrivalKind;
  title: string;
  subtitle?: string;
  // Small facts shown as rows, e.g. "Cylinders: 2 × Medium".
  details?: { label: string; value: string }[];
  actionLabel: string;
  onAction: () => void;
  onDismiss: () => void;
  // When set, shows a "report a mismatch" link (wrong size, wrong cylinder, no LPG...).
  onReport?: () => void;
  busy?: boolean;
}

const KIND_STYLE: Record<ArrivalKind, { color: string; tint: string; Icon: typeof MapPin }> = {
  pickup: { color: '#FF8D28', tint: '#FFF4EA', Icon: Package },
  station: { color: '#0A84FF', tint: '#EAF4FF', Icon: GasPump },
  dropoff: { color: '#34C759', tint: '#EBF9EE', Icon: MapPin },
};

// Pops up when the rider reaches a stop, with the one action that stop needs:
// collect the empty cylinder, or hand over the full one.
export default function ArrivalSheet({
  visible,
  kind,
  title,
  subtitle,
  details,
  actionLabel,
  onAction,
  onDismiss,
  onReport,
  busy,
}: ArrivalSheetProps) {
  const { color, tint, Icon } = KIND_STYLE[kind];
  return (
    <FloatingSheet
      visible={visible}
      onClose={onDismiss}
      alert
      footer={
        <>
          <SheetButton title="Not yet" variant="secondary" onPress={onDismiss} disabled={busy} />
          <SheetButton
            title={actionLabel}
            variant={kind === 'dropoff' ? 'success' : 'primary'}
            onPress={onAction}
            disabled={busy}
          />
        </>
      }
    >
      <View style={[styles.iconCircle, { backgroundColor: tint }]}>
        <Icon size={28} color={color} weight="fill" />
      </View>
      <View style={styles.textGroup}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {details && details.length > 0 && (
        <View style={styles.details}>
          {details.map((row) => (
            <View key={row.label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{row.label}</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      )}
      {onReport && (
        <TouchableOpacity
          style={styles.reportButton}
          onPress={onReport}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Report a mismatch"
        >
          <Flag size={16} color="#D92D20" weight="fill" />
          <Text style={styles.reportText}>Something doesn&apos;t match? Report it</Text>
        </TouchableOpacity>
      )}
    </FloatingSheet>
  );
}

const styles = StyleSheet.create({
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textGroup: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.6)',
    textAlign: 'center',
  },
  details: {
    alignSelf: 'stretch',
    marginHorizontal: 16,
    backgroundColor: '#F7F7F7',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
  },
  detailLabel: {
    fontSize: 13,
    color: 'rgba(0,0,0,0.55)',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FEF3F2',
  },
  reportText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B42318',
  },
  detailValue: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
});
