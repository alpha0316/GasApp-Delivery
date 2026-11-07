import { Redirect } from 'expo-router';
import React from 'react';
import { nextRoute } from '../features/auth/nextRoute';
import SplashScreen from '../features/auth/screens/SplashScreen';
import { useAuthStore } from '../features/auth/store';

export default function Index() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  if (status === 'signedOut') return <Redirect href="/phone" />;
  if (status === 'signedIn' && user) return <Redirect href={nextRoute(user)} />;
  return <SplashScreen />;
}
