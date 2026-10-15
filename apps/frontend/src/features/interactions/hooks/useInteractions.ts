import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { interactionsApi } from "../services/interactionsApi";
import type {
  CreateInteractionInput,
  UpdateInteractionInput,
  ListInteractionsParams,
} from "../types";
import { ANALYTICS_QUERY_KEY } from "../../analytics/queryKeys";
import { toast } from "sonner";

const INTERACTIONS_QUERY_KEY = "interactions";

export function useInteractions(params?: ListInteractionsParams) {
  return useQuery({
    queryKey: [INTERACTIONS_QUERY_KEY, params],
    queryFn: () => interactionsApi.list(params),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useInteraction(id: number) {
  return useQuery({
    queryKey: [INTERACTIONS_QUERY_KEY, id],
    queryFn: () => interactionsApi.getById(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCustomerInteractions(customerId: number) {
  return useQuery({
    queryKey: [INTERACTIONS_QUERY_KEY, "customer", customerId],
    queryFn: () => interactionsApi.getByCustomer(customerId),
    enabled: !!customerId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreateInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInteractionInput) => interactionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INTERACTIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
      toast.success("Interaction created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create interaction");
    },
  });
}

export function useUpdateInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateInteractionInput }) =>
      interactionsApi.update(id, data),
    onSuccess: (updatedInteraction, variables) => {
      queryClient.setQueryData([INTERACTIONS_QUERY_KEY, variables.id], updatedInteraction);
      queryClient.invalidateQueries({ 
        queryKey: [INTERACTIONS_QUERY_KEY],
        exact: false,
        refetchType: 'active',
      });
      toast.success("Interaction updated successfully");
      queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update interaction");
    },
  });
}

export function useDeleteInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => interactionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INTERACTIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
      toast.success("Interaction deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete interaction");
    },
  });
}
