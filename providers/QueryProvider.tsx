import { QueryClientProvider, focusManager } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import { refreshSessionIfNeeded } from '@/lib/auth/refresh-session';
import { createQueryClient } from '@/lib/query/query-client';

const queryClient = createQueryClient();

function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
    if (status === 'active') {
      void refreshSessionIfNeeded();
    }
  }
}

export function QueryProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void refreshSessionIfNeeded();
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export { queryClient };
