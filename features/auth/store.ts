import { create } from 'zustand';
import { ApiError, configureApiClient, errorMessage } from '../../lib/api/client';
import type { User } from '../../lib/api/types';
import { queryClient } from '../../lib/query/queryClient';
import { clearToken, readToken, writeToken } from '../../lib/storage/token';
import { unregisterPushToken } from '../notifications/push';
import { fetchMe } from './api';

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
