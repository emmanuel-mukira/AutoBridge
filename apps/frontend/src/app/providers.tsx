import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/query-client';
import { useAuthActions } from './store';
import { useEffect, useRef } from 'react';
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout';

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Initializes the user session on app mount
 */
function SessionInitializer({ children }: { children: React.ReactNode }) {
  const { checkSession } = useAuthActions();
  const mounted = useRef(false);

  useInactivityTimeout();

  useEffect(() => {
    if (!mounted.current) {
      checkSession();
      mounted.current = true;
    }
  }, [checkSession]);

  return <>{children}</>;
}

/**
 * Global providers wrapper for the application
 * Wraps the app with TanStack Query and Session Initializer
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionInitializer>
        {children}
      </SessionInitializer>
      {/* Show React Query DevTools in development */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
