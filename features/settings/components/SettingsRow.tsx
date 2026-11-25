import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import type { Icon } from 'phosphor-react-native';
import { colors } from '../theme';

// The small filled circle with a white glyph that starts every Notification row.
export function IconDot({ icon: Glyph, color }: { icon: Icon; color: string }) {
  return (
    <View style={[styles.iconDot, { backgroundColor: color }]}>
      <Glyph size={14} weight="fill" color="#fff" />
    </View>
  );
}

// Grey uppercase label over a group of rows ("JOBS", "PHONE NOTIFICATIONS").
export function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.section}>{children}</Text>;
}

// A setting with a title, one line of explanation and a switch. Disabled rows fade out.
export function ToggleRow({
  icon,
  color,
  title,
  detail,
  value,
  onValueChange,
  disabled,
}: {
  icon: Icon;
  color: string;
  title: string;
  detail: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.row, disabled && styles.disabled]}>
      <IconDot icon={icon} color={color} />
      <View style={styles.flex}>
        <Text style={styles.label}>{title}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
      <Switch
        value={value && !disabled}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ true: colors.primary, false: colors.switchOff }}
        accessibilityLabel={title}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  iconDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  section: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 24,
    marginBottom: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  disabled: { opacity: 0.45 },
  label: { flex: 1, fontSize: 15, color: colors.text },
  detail: { fontSize: 12, color: 'rgba(0,0,0,0.5)', marginTop: 2, lineHeight: 16 },
});
