import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminUsersApi } from "../services/adminUsers";

export const userKeys = { all: ["admin-users"] as const };

export function useUsers() {
  return useQuery({ queryKey: userKeys.all, queryFn: adminUsersApi.list });
}

export function useUserAction<T>(action: (input: T) => Promise<unknown>, success: string) {
  const query = useQueryClient();
  return useMutation({ mutationFn: action, onSuccess: () => { query.invalidateQueries({ queryKey: userKeys.all }); toast.success(success); }, onError: (error) => toast.error(error instanceof Error ? error.message : "User update failed") });
}
