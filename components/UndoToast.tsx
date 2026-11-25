import React, { useEffect } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ArrowCounterClockwise } from 'phosphor-react-native';

interface UndoToastProps {
  message: string;
  // How long until the action goes through; the bar drains over this time.
  durationMs: number;
  onUndo: () => void;
}

// Floating pill above the tab bar with an Undo button. Render it with a
// `key` per action so the countdown bar restarts for each one.
export default function UndoToast({ message, durationMs, onUndo }: UndoToastProps) {
  const progress = useSharedValue(1);

  useEffect(() => {
    progress.value = withTiming(0, { duration: durationMs, easing: Easing.linear });
  }, [durationMs, progress]);

  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutDown.duration(180)}
      style={styles.toast}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.row}>
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
        <TouchableOpacity
          style={styles.undoButton}
          onPress={onUndo}
          accessibilityRole="button"
          accessibilityLabel="Undo"
          hitSlop={8}
        >
          <ArrowCounterClockwise size={16} color="#fff" weight="bold" />
          <Text style={styles.undoText}>Undo</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.bar, barStyle]} />
      </View>
    </Animated.View>
  );
}

// Clears the floating tab bar (bottom offset + height) with a small gap.
const TAB_BAR_CLEARANCE = (Platform.OS === 'ios' ? 32 : 20) + 68 + 12;

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: TAB_BAR_CLEARANCE,
    backgroundColor: '#1D1D1D',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  undoText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  track: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  bar: {
    height: 3,
    backgroundColor: '#FF8D28',
  },
});
