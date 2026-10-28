import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientsApi } from "../services/clientsApi";

const keys = { all: ["clients"] as const, detail: (id: number) => ["clients", id] as const };

export const useClients = () => useQuery({ queryKey: keys.all, queryFn: clientsApi.list });
export const useClient = (id: number) => useQuery({ queryKey: keys.detail(id), queryFn: () => clientsApi.getById(id), enabled: !!id });
export const useClientOwners = () => useQuery({ queryKey: ["clients", "owners"], queryFn: clientsApi.owners });
export const useClientSalesHistory = (id: number) => useQuery({ queryKey: ["clients", id, "sales-history"], queryFn: () => clientsApi.salesHistory(id), enabled: Number.isInteger(id) && id > 0 });
export function useSaveClient() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: Parameters<typeof clientsApi.create>[0] }) =>
      id ? clientsApi.update(id, input) : clientsApi.create(input),
    onSuccess: (_client, variables) => {
      client.invalidateQueries({ queryKey: keys.all });
      if (variables.id) client.invalidateQueries({ queryKey: keys.detail(variables.id) });
    },
  });
}
