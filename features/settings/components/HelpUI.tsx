import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, type Icon } from 'phosphor-react-native';
import type { Block } from '../content';
import { colors } from '../theme';

// Large-title header for Help & Support and Terms & Privacy, with a back arrow.
export function LargeHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => router.canGoBack() && router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.back}
        >
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

// Big grey tile: label and detail on the left, a large tinted icon circle on the right.
export function ActionTile({
  label,
  detail,
  icon: Glyph,
  color,
  onPress,
}: {
  label: string;
  detail?: string;
  icon: Icon;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.actionTile} onPress={onPress} accessibilityRole="button" activeOpacity={0.7}>
      <View style={styles.flex}>
        <Text style={styles.actionLabel}>{label}</Text>
        {!!detail && <Text style={styles.actionDetail}>{detail}</Text>}
      </View>
      <View style={[styles.actionIcon, { backgroundColor: `${color}1A` }]}>
        <Glyph size={30} weight="duotone" color={color} />
      </View>
    </TouchableOpacity>
  );
}

// Renders one block of help or legal text: a paragraph, bullet list, numbered steps or a
// two-column table.
export function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case 'p':
      return <Text style={styles.p}>{block.text}</Text>;
    case 'list':
      return (
        <View style={styles.list}>
          {block.items.map((item) => (
            <View key={item} style={styles.listRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={[styles.p, styles.flex]}>{item}</Text>
            </View>
          ))}
        </View>
      );
    case 'steps':
      return (
        <View style={styles.list}>
          {block.items.map((item, i) => (
            <View key={item} style={styles.listRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={[styles.p, styles.flex]}>{item}</Text>
            </View>
          ))}
        </View>
      );
    case 'table':
      return (
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHead]}>
            <Text style={[styles.tableCell, styles.tableHeadText]}>{block.head[0]}</Text>
            <Text style={[styles.tableCell, styles.tableHeadText, styles.tableRight]}>{block.head[1]}</Text>
          </View>
          {block.rows.map(([a, b], i) => (
            <View key={a} style={[styles.tableRow, i === block.rows.length - 1 && styles.tableLast]}>
              <Text style={[styles.tableCell, styles.tableKey]}>{a}</Text>
              <Text style={[styles.tableCell, styles.tableRight, b.length > 14 && styles.tableLong]}>{b}</Text>
            </View>
          ))}
        </View>
      );
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8, backgroundColor: colors.background },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  back: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 34, fontWeight: '800', color: colors.heading, marginTop: 16, letterSpacing: -0.5 },
  subtitle: { fontSize: 20, color: 'rgba(0,0,0,0.6)', marginTop: 6 },
  actionTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 80,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: colors.tile,
  },
  actionLabel: { fontSize: 17, color: colors.heading },
  actionDetail: { fontSize: 13, color: 'rgba(0,0,0,0.5)', marginTop: 3 },
  actionIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  p: { fontSize: 15, lineHeight: 22, color: 'rgba(0,0,0,0.8)' },
  list: { gap: 8 },
  listRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bullet: { fontSize: 15, lineHeight: 22, color: 'rgba(0,0,0,0.5)' },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(11,132,87,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontSize: 12, fontWeight: '700', color: colors.support },
  table: { borderRadius: 12, borderWidth: 1, borderColor: colors.divider, overflow: 'hidden' },
  tableRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tableLast: { borderBottomWidth: 0 },
  tableHead: { backgroundColor: colors.surface },
  tableHeadText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase' },
  tableCell: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },
  tableKey: { fontWeight: '600' },
  tableRight: { textAlign: 'right' },
  // Sentences read better left-aligned and given more room.
  tableLong: { textAlign: 'left', flex: 1.6, color: 'rgba(0,0,0,0.7)' },
});
