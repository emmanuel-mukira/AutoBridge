import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accountsApi } from "../services/accountsApi";

const keys = { all: ["accounts"] as const, detail: (id: number) => ["accounts", id] as const };

export const useAccounts = () => useQuery({ queryKey: keys.all, queryFn: accountsApi.list });
export const useAccount = (id: number) => useQuery({ queryKey: keys.detail(id), queryFn: () => accountsApi.getById(id), enabled: !!id });
export const useAccountOwners = () => useQuery({ queryKey: ["accounts", "owners"], queryFn: accountsApi.owners });
export function useSaveAccount() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: Parameters<typeof accountsApi.create>[0] }) =>
      id ? accountsApi.update(id, input) : accountsApi.create(input),
    onSuccess: (_account, variables) => {
      client.invalidateQueries({ queryKey: keys.all });
      if (variables.id) client.invalidateQueries({ queryKey: keys.detail(variables.id) });
    },
  });
}
