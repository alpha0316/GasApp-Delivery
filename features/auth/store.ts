import { create } from 'zustand';
import { ApiError, configureApiClient, errorMessage } from '../../lib/api/client';
import { MOCK_API, MOCK_SCENARIO_RIDER, mockResetRider } from '../../lib/api/devMock';
import type { User } from '../../lib/api/types';
import { queryClient } from '../../lib/query/queryClient';
import { clearToken, readToken, writeToken } from '../../lib/storage/token';
import { unregisterPushToken } from '../notifications/push';
import { fetchMe } from './api';

// TEMP: set to false to skip login entirely and land signed in as the
// current lib/api/devMock.ts MOCK_SCENARIO's rider, for exploring/
// redesigning screens with zero clicks. Flip back to true before shipping.
// (Also uses lib/api/client.ts's DEV_BYPASS_TOKEN handling.) Set to true
// (with lib/api/devMock.ts's MOCK_API also true) to walk through the
// onboarding screens themselves against mocked API responses instead.
const AUTH = true;

const DEV_FAKE_USER = MOCK_SCENARIO_RIDER;

const DEV_BYPASS_TOKEN = 'dev-token';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn' | 'error';

interface AuthState {
  status: AuthStatus;
  token: string | null;
  user: User | null;
  bootstrapError: string | null;
  bootstrap: () => Promise<void>;
  signIn: (token: string, user: User) => Promise<void>;
  setUser: (user: User) => void;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  token: null,
  user: null,
  bootstrapError: null,

  bootstrap: async () => {
    set({ status: 'loading', bootstrapError: null });
    if (!AUTH) {
      set({ status: 'signedIn', token: DEV_BYPASS_TOKEN, user: DEV_FAKE_USER });
      return;
    }
    const token = await readToken();
    if (!token) {
      set({ status: 'signedOut', token: null, user: null });
      return;
    }
    set({ token });
    try {
      const { user } = await fetchMe();
      if (user.role !== 'rider') {
        await get().signOut();
        return;
      }
      set({ status: 'signedIn', user });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await get().signOut();
        return;
      }
      set({ status: 'error', bootstrapError: errorMessage(error) });
    }
  },

  signIn: async (token, user) => {
    await writeToken(token);
    set({ status: 'signedIn', token, user, bootstrapError: null });
  },

  setUser: (user) => set({ user }),

  refreshUser: async () => {
    const { user } = await fetchMe();
    set({ user });
  },

  signOut: async () => {
    try {
      await unregisterPushToken();
    } catch (error) {
      // The server keeps only the newest 5 tokens per user, so sign-out continues.
      console.warn('Could not remove the push token:', errorMessage(error));
    }
    await clearToken();
    if (MOCK_API) mockResetRider();
    queryClient.clear();
    set({ status: 'signedOut', token: null, user: null, bootstrapError: null });
  },
}));

configureApiClient({
  getToken: () => useAuthStore.getState().token,
  onUnauthorized: () => {
    void useAuthStore.getState().signOut();
  },
});
