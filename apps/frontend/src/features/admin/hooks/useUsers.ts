import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listUsers as apiListUsers,
  changeUserRole as apiChangeUserRole,
  changeUserStatus as apiChangeUserStatus,
  type UserSummary,
} from '@/features/admin/services/adminUsers';

/**
 * Query key factory for user-related queries
 * Centralizes query key management for better cache control
 */
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: number) => [...userKeys.details(), id] as const,
};

/**
 * Hook to fetch all users with automatic caching and refetching
 * Uses TanStack Query for server state management
 */
export function useUsers() {
  return useQuery({
    queryKey: userKeys.lists(),
    queryFn: async () => {
      const response = await apiListUsers();
      return response.users;
    },
    // Smart refetching strategy - no continuous polling
    refetchInterval: false,
    // Refetch when window regains focus (user comes back to tab)
    refetchOnWindowFocus: true,
    // Refetch when network reconnects
    refetchOnReconnect: true,
    // Keep data fresh for 2 minutes (reduces unnecessary requests)
    staleTime: 1000 * 60 * 2,
    // Keep in cache for 5 minutes
    gcTime: 1000 * 60 * 5,
  });
}

/**
 * Mutation hook to change a user's role
 * Includes optimistic updates and automatic cache invalidation
 */
export function useChangeUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: 'admin' | 'sales_rep' }) =>
      apiChangeUserRole(userId, role),
    
    // Optimistic update: Update UI immediately before server responds
    onMutate: async ({ userId, role }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: userKeys.lists() });

      // Snapshot previous value
      const previousUsers = queryClient.getQueryData<UserSummary[]>(userKeys.lists());

      // Optimistically update cache
      if (previousUsers) {
        queryClient.setQueryData<UserSummary[]>(
          userKeys.lists(),
          previousUsers.map((user) =>
            user.id === userId
              ? { ...user, role: { name: role } }
              : user
          )
        );
      }

      return { previousUsers };
    },

    // Rollback on error
    onError: (error, _variables, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(userKeys.lists(), context.previousUsers);
      }
      const message = error instanceof Error ? error.message : 'Failed to change role';
      toast.error(message);
    },

    // Refetch after success
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      toast.success('User role updated successfully');
    },
  });
}

/**
 * Mutation hook to change a user's status
 * Includes optimistic updates and automatic cache invalidation
 */
export function useChangeUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, status }: { userId: number; status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' }) =>
      apiChangeUserStatus(userId, status),
    
    // Optimistic update
    onMutate: async ({ userId, status }) => {
      await queryClient.cancelQueries({ queryKey: userKeys.lists() });

      const previousUsers = queryClient.getQueryData<UserSummary[]>(userKeys.lists());

      if (previousUsers) {
        queryClient.setQueryData<UserSummary[]>(
          userKeys.lists(),
          previousUsers.map((user) =>
            user.id === userId
              ? { ...user, status }
              : user
          )
        );
      }

      return { previousUsers };
    },

    // Rollback on error
    onError: (error, _variables, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(userKeys.lists(), context.previousUsers);
      }
      const message = error instanceof Error ? error.message : 'Failed to change status';
      toast.error(message);
    },

    // Refetch after success
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      toast.success('User status updated successfully');
    },
  });
}
