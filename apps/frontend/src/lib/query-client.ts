import { QueryClient } from '@tanstack/react-query';

/**
 * Global QueryClient configuration for TanStack Query
 * Handles caching, retries, and default options for all queries
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: (failureCount: number, error: Error) => {
        if ('response' in error && typeof error.response === 'object' && error.response !== null) {
          const status = (error.response as { status?: number }).status;
          if (status && status >= 400 && status < 500) {
            return false;
          }
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: true,
      refetchOnMount: false,
    },
    mutations: {
      retry: 1,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['analytics'] });
      },
    },
  },
});
