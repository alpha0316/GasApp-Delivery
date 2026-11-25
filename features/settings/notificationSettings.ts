import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

// The rider's notification choices, kept on the device (same approach as the customer app,
// whose API has no endpoint for them).
export interface NotificationPrefs {
  // In-app pop-up when a new job is offered while the rider is busy with another.
  jobBanners: boolean;
  // Job alerts in Notification Center / on the lock screen.
  phoneAlerts: boolean;
  // Sound with phone alerts.
  sound: boolean;
}

export const DEFAULT_PREFS: NotificationPrefs = {
  jobBanners: true,
  phoneAlerts: true,
  sound: true,
};

const KEY = 'rider-notification-settings';

interface State extends NotificationPrefs {
  loaded: boolean;
  load: () => Promise<void>;
  set: (patch: Partial<NotificationPrefs>) => void;
}

const pick = (s: NotificationPrefs): NotificationPrefs => ({
  jobBanners: s.jobBanners,
  phoneAlerts: s.phoneAlerts,
  sound: s.sound,
});

export const useNotificationPrefs = create<State>((set, get) => ({
  ...DEFAULT_PREFS,
  loaded: false,
  load: async () => {
    if (get().loaded) return;
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      // Spread over the defaults so settings added later get their default value.
      set({ ...DEFAULT_PREFS, ...(raw ? (JSON.parse(raw) as Partial<NotificationPrefs>) : {}), loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  set: (patch) => {
    set(patch);
    SecureStore.setItemAsync(KEY, JSON.stringify(pick({ ...get(), ...patch }))).catch((e: unknown) =>
      console.warn('Could not save notification settings', e)
    );
  },
}));

// For non-React code (the push notification handler) that reads the choice when it acts.
export const notificationPrefs = (): NotificationPrefs => pick(useNotificationPrefs.getState());
