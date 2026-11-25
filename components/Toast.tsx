import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { CheckCircle, Info, WarningCircle } from 'phosphor-react-native';
import { create } from 'zustand';

export type ToastTone = 'info' | 'success' | 'warning';

interface ToastItem {
  id: number;
  title: string;
  message?: string;
  tone: ToastTone;
}

interface ToastState {
  current: ToastItem | null;
  show: (item: Omit<ToastItem, 'id'>) => void;
  hide: (id: number) => void;
}

let nextId = 1;

const useToastStore = create<ToastState>((set) => ({
  current: null,
  show: (item) => set({ current: { ...item, id: nextId++ } }),
  hide: (id) => set((state) => (state.current?.id === id ? { current: null } : state)),
}));

const VISIBLE_MS = 3200;

// Shows a short in-app notice at the top of the screen. A newer toast
// replaces the one on screen. Callable from anywhere, not just components.
export function showToast(title: string, options: { message?: string; tone?: ToastTone } = {}) {
  useToastStore.getState().show({ title, message: options.message, tone: options.tone ?? 'info' });
}

const TONES: Record<ToastTone, { color: string; Icon: typeof Info }> = {
  info: { color: '#0A84FF', Icon: Info },
  success: { color: '#34C759', Icon: CheckCircle },
  warning: { color: '#FF8D28', Icon: WarningCircle },
};

// Render once, near the root, above the navigator.
export function ToastHost() {
  const insets = useSafeAreaInsets();
  const current = useToastStore((s) => s.current);
  const hide = useToastStore((s) => s.hide);

  useEffect(() => {
    if (!current) return;
    const timeout = setTimeout(() => hide(current.id), VISIBLE_MS);
    return () => clearTimeout(timeout);
  }, [current, hide]);

  if (!current) return null;
  const { color, Icon } = TONES[current.tone];

  return (
    <View pointerEvents="none" style={[styles.host, { top: insets.top + 72 }]}>
      <Animated.View
        key={current.id}
        entering={FadeInUp.duration(220)}
        exiting={FadeOutUp.duration(180)}
        style={styles.toast}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
      >
        <Icon size={22} color={color} weight="fill" />
        <View style={styles.textGroup}>
          <Text style={styles.title} numberOfLines={1}>
            {current.title}
          </Text>
          {current.message ? (
            <Text style={styles.message} numberOfLines={2}>
              {current.message}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 2000,
    elevation: 20,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1D1D1D',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  textGroup: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  message: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
});
