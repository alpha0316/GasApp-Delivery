// The task must be defined at app start so the OS can wake it in the background.
import '../features/location/backgroundTask';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RiderSession from '../features/auth/RiderSession';
import { mustLeaveForPending } from '../features/auth/nextRoute';
import { useAuthStore } from '../features/auth/store';
import { queryClient } from '../lib/query/queryClient';

const SIGNED_OUT_ROUTES = ['phone', 'otp'];

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const approved = useAuthStore((s) => s.user?.isApproved ?? false);
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // After a sign-out (or a rejected token) leave the signed-in screens.
  useEffect(() => {
    const first = (segments as string[])[0];
    if (!navigationState?.key || status !== 'signedOut' || first === undefined) return;
    if (!SIGNED_OUT_ROUTES.includes(first)) router.replace('/phone');
  }, [navigationState?.key, status, segments, router]);

  // A rider suspended while signed in goes back to the approval screen.
  useEffect(() => {
    if (status !== 'signedIn' || !user || !navigationState?.key) return;
    if (mustLeaveForPending(user, (segments as string[])[0])) router.replace('/pending');
  }, [navigationState?.key, status, user, segments, router]);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="dark" />
        {status === 'signedIn' && approved && <RiderSession />}
        <Stack screenOptions={{ headerShown: false }} />
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
