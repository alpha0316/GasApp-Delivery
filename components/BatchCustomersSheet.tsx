import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArrowDown, ArrowUp, CheckCircle, NavigationArrow, Phone } from 'phosphor-react-native';
import { formatMinor } from '../lib/format/money';
import FloatingSheet, { SheetButton } from './FloatingSheet';
import type { LatLng } from '../types/order';

export type BatchStopState = 'next' | 'pending' | 'done';

export interface BatchStop {
  id: string;
  name: string;
  phone: string;
  address: string;
  // e.g. "2 × Medium"
  cylinders: string;
  location: LatLng;
  state: BatchStopState;
  // Order total, minor units (pesewas).
  amount: number;
  // From the rider's current position; null until there's a GPS fix.
  distanceMeters: number | null;
  // ISO time the customer placed the order.
  createdAt: string;
  // Their chosen filling station, shown when the run uses more than one.
  station?: string;
}

type SortKey = 'route' | 'price' | 'distance' | 'time';

// Each sort's natural direction first: priciest, nearest, waited longest.
const SORTS: { key: SortKey; label: string; compare: (a: BatchStop, b: BatchStop) => number }[] = [
  { key: 'route', label: 'Route', compare: () => 0 },
  { key: 'price', label: 'Price', compare: (a, b) => b.amount - a.amount },
  {
    key: 'distance',
    label: 'Distance',
    compare: (a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity),
  },
  { key: 'time', label: 'Time placed', compare: (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) },
];

const formatDistance = (meters: number | null) =>
  meters === null ? null : meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;

function formatAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.floor(hours / 24)} d ago`;
}

interface BatchCustomersSheetProps {
  visible: boolean;
  onClose: () => void;
  // 'collect' while picking up empties, 'deliver' once filled.
  mode: 'collect' | 'deliver';
  stops: BatchStop[];
  // Shows the road route to that customer on the tracking map.
  onShowRoute: (id: string) => void;
}

const COPY = {
  collect: { title: 'Cylinder pickups', left: 'Left to collect', done: 'Collected', next: 'Next pickup' },
  deliver: { title: 'Drop-offs', left: 'Left to deliver', done: 'Delivered', next: 'Delivering now' },
} as const;

// Every customer in the batch, split into the ones still to visit and the ones done, each
// with a call button and a button that shows the road route to them on the map. Opened from the tracking header.
export default function BatchCustomersSheet({ visible, onClose, mode, stops, onShowRoute }: BatchCustomersSheetProps) {
  const copy = COPY[mode];
  const [sortKey, setSortKey] = useState<SortKey>('route');
  // Tapping the active chip again flips its direction.
  const [reversed, setReversed] = useState(false);

  const pickSort = (key: SortKey) => {
    if (key === sortKey) {
      if (key !== 'route') setReversed((r) => !r);
      return;
    }
    setSortKey(key);
    setReversed(false);
  };

  const sortStops = (list: BatchStop[]) => {
    // Route order keeps the stop being visited now on top, then the batch order.
    if (sortKey === 'route') return [...list].sort((a, b) => (a.state === 'next' ? -1 : b.state === 'next' ? 1 : 0));
    const { compare } = SORTS.find((s) => s.key === sortKey)!;
    return [...list].sort((a, b) => (reversed ? -compare(a, b) : compare(a, b)));
  };

  const left = sortStops(stops.filter((s) => s.state !== 'done'));
  const done = sortStops(stops.filter((s) => s.state === 'done'));

  return (
    <FloatingSheet
      visible={visible}
      onClose={onClose}
      contentStyle={styles.content}
      footer={<SheetButton title="Close" variant="secondary" onPress={onClose} />}
    >
      <View style={styles.headerRow}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.count}>
          {done.length} of {stops.length} {copy.done.toLowerCase()}
        </Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${stops.length ? (done.length / stops.length) * 100 : 0}%` }]} />
      </View>

      <View style={styles.sortRow} accessibilityRole="radiogroup" accessibilityLabel="Sort customers">
        {SORTS.map(({ key, label }) => {
          const on = key === sortKey;
          const Arrow = reversed ? ArrowUp : ArrowDown;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => pickSort(key)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`Sort by ${label}`}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
              {on && key !== 'route' && <Arrow size={11} color="#fff" weight="bold" />}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {left.length > 0 && <Text style={styles.sectionLabel}>{copy.left}</Text>}
        {left.map((stop) => (
          <StopRow key={stop.id} stop={stop} nextLabel={copy.next} onShowRoute={onShowRoute} />
        ))}

        {done.length > 0 && <Text style={styles.sectionLabel}>{copy.done}</Text>}
        {done.map((stop) => (
          <StopRow key={stop.id} stop={stop} nextLabel={copy.next} doneLabel={copy.done} onShowRoute={onShowRoute} />
        ))}
      </ScrollView>
    </FloatingSheet>
  );
}

function StopRow({
  stop,
  nextLabel,
  doneLabel,
  onShowRoute,
}: {
  stop: BatchStop;
  nextLabel: string;
  doneLabel?: string;
  onShowRoute: (id: string) => void;
}) {
  const isDone = stop.state === 'done';
  const isNext = stop.state === 'next';
  return (
    <View style={[styles.row, isNext && styles.rowNext]}>
      <View style={[styles.dot, isDone ? styles.dotDone : isNext ? styles.dotNext : styles.dotPending]}>
        {isDone && <CheckCircle size={14} color="#fff" weight="fill" />}
      </View>
      <View style={styles.rowText}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, isDone && styles.dimmed]} numberOfLines={1}>
            {stop.name}
          </Text>
          {isNext && <Text style={styles.badgeNext}>{nextLabel}</Text>}
          {isDone && doneLabel && <Text style={styles.badgeDone}>{doneLabel}</Text>}
        </View>
        <Text style={styles.meta} numberOfLines={1}>
          {stop.address} · {stop.cylinders}
          {stop.station ? ` · ${stop.station}` : ''}
        </Text>
        <Text style={styles.facts} numberOfLines={1}>
          ₵{formatMinor(stop.amount)}
          {formatDistance(stop.distanceMeters) ? ` · ${formatDistance(stop.distanceMeters)}` : ''} · {formatAgo(stop.createdAt)}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.action, !stop.phone && styles.actionDisabled]}
        onPress={() => Linking.openURL(`tel:${stop.phone}`)}
        disabled={!stop.phone}
        accessibilityRole="button"
        accessibilityLabel={`Call ${stop.name}`}
      >
        <Phone size={18} color="#34C759" weight="fill" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.action}
        onPress={() => onShowRoute(stop.id)}
        accessibilityRole="button"
        accessibilityLabel={`Show route to ${stop.name}`}
      >
        <NavigationArrow size={18} color="#007AFF" weight="fill" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'stretch', paddingHorizontal: 16, gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '700', color: '#000' },
  count: { fontSize: 13, color: 'rgba(0,0,0,0.55)' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: '#F0F0F0', overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: '#34C759' },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F2F2F2',
  },
  chipOn: { backgroundColor: '#000' },
  chipText: { fontSize: 13, fontWeight: '600', color: 'rgba(0,0,0,0.7)' },
  chipTextOn: { color: '#fff' },
  facts: { fontSize: 12, fontWeight: '600', color: 'rgba(0,0,0,0.7)' },
  list: { maxHeight: 380 },
  listContent: { gap: 8, paddingBottom: 4 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.45)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  rowNext: { backgroundColor: '#FFF7EF', borderColor: '#FFD6AE' },
  dot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: '#34C759' },
  dotNext: { backgroundColor: '#FF8D28' },
  dotPending: { borderWidth: 2, borderColor: 'rgba(0,0,0,0.2)' },
  rowText: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: '#000' },
  dimmed: { color: 'rgba(0,0,0,0.5)' },
  meta: { fontSize: 12, color: 'rgba(0,0,0,0.5)' },
  badgeNext: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B54708',
    backgroundColor: '#FFEAD5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  badgeDone: {
    fontSize: 11,
    fontWeight: '700',
    color: '#067647',
    backgroundColor: '#DCFAE6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  action: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDisabled: { opacity: 0.4 },
});
