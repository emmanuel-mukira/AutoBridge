import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leadsApi } from "../services/leadsApi";
import type {
  CreateLeadInput,
  UpdateLeadInput,
  ListLeadsParams,
} from "../types";
import { ANALYTICS_QUERY_KEY } from "../../analytics/queryKeys";
import { toast } from "sonner";

const LEADS_QUERY_KEY = "leads";

export function useLeads(params?: ListLeadsParams) {
  return useQuery({
    queryKey: [LEADS_QUERY_KEY, params],
    queryFn: () => leadsApi.list(params),
    staleTime: 30 * 1000, // 30 seconds - data is fresh for this duration
    gcTime: 5 * 60 * 1000, // 5 minutes - cache persists for this duration
    refetchOnWindowFocus: false, // Prevent refetch on window focus for better UX
  });
}

export function useLead(id: number) {
  return useQuery({
    queryKey: [LEADS_QUERY_KEY, id],
    queryFn: () => leadsApi.getById(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLeadInput) => leadsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
      toast.success("Lead created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create lead");
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateLeadInput }) =>
      leadsApi.update(id, data),
    onSuccess: (updatedLead, variables) => {
      // Optimistic update: immediately update cache instead of invalidating
      queryClient.setQueryData([LEADS_QUERY_KEY, variables.id], updatedLead);
      
      // Invalidate list to refetch with updated data
      queryClient.invalidateQueries({ 
        queryKey: [LEADS_QUERY_KEY],
        exact: false,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
      toast.success("Lead updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update lead");
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => leadsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LEADS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
      toast.success("Lead deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete lead");
    },
  });
}
