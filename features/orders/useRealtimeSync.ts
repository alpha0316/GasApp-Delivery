import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { MOCK_API } from '../../lib/api/devMock';
import { connectSocket, disconnectSocket } from '../../lib/realtime/socket';
import { useAuthStore } from '../auth/store';
import { poolKey } from '../pool/hooks';
import { profileKey } from '../profile/hooks';
import { ordersKey } from './hooks';

// Keeps the pool and the queue fresh with Socket.IO events. Events sent while
// the socket was down are lost, so every reconnect fetches the data again.
export function useRealtimeSync() {
  const token = useAuthStore((s) => s.token);
  const signOut = useAuthStore((s) => s.signOut);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const queryClient = useQueryClient();

  useEffect(() => {
    // The dev mock only answers REST calls. A real socket connection with
    // the fake token would hit the real backend, get rejected, and sign out.
    if (!token || MOCK_API) return;
    const socket = connectSocket(token);

    const refreshPool = () => void queryClient.invalidateQueries({ queryKey: poolKey });
    const refreshOrders = () => {
      void queryClient.invalidateQueries({ queryKey: ordersKey });
      void queryClient.invalidateQueries({ queryKey: profileKey });
    };
    const refreshAll = () => {
      refreshUser().catch((error) => console.warn('Could not refresh the user:', error));
      refreshPool();
      refreshOrders();
    };
    const onRemoved = () => {
      refreshAll();
    };
    const onConnectError = (error: Error) => {
      if (error.message === 'Authentication required') void signOut();
    };

    socket.on('order:new', refreshPool);
    socket.on('order:removed', onRemoved);
    socket.on('order:status', refreshOrders);
    socket.on('connect', refreshAll);
    socket.on('connect_error', onConnectError);

    return () => {
      socket.off('order:new', refreshPool);
      socket.off('order:removed', onRemoved);
      socket.off('order:status', refreshOrders);
      socket.off('connect', refreshAll);
      socket.off('connect_error', onConnectError);
      disconnectSocket();
    };
  }, [token, queryClient, signOut, refreshUser]);
}
