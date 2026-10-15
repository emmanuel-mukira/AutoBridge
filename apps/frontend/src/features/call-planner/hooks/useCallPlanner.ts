import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { callPlannerApi } from "../services/callPlannerApi";
import type {
  CreateCallPlanInput,
  UpdateCallPlanInput,
  MarkCompletedInput,
  ListCallPlansParams,
} from "../types";
import { ANALYTICS_QUERY_KEY } from "../../analytics/queryKeys";
import { toast } from "sonner";

const CALL_PLANS_QUERY_KEY = "call-plans";

export function useCallPlans(params?: ListCallPlansParams) {
  return useQuery({
    queryKey: [CALL_PLANS_QUERY_KEY, params],
    queryFn: () => callPlannerApi.list(params),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useCallPlan(id: number) {
  return useQuery({
    queryKey: [CALL_PLANS_QUERY_KEY, id],
    queryFn: () => callPlannerApi.getById(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreateCallPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCallPlanInput) => callPlannerApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CALL_PLANS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
      toast.success("Call plan created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create call plan");
    },
  });
}

export function useUpdateCallPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCallPlanInput }) =>
      callPlannerApi.update(id, data),
    onSuccess: (updatedPlan, variables) => {
      queryClient.setQueryData([CALL_PLANS_QUERY_KEY, variables.id], updatedPlan);
      queryClient.invalidateQueries({ 
        queryKey: [CALL_PLANS_QUERY_KEY],
        exact: false,
        refetchType: 'active',
      });
      toast.success("Call plan updated successfully");
      queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update call plan");
    },
  });
}

export function useMarkCallPlanCompleted() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: MarkCompletedInput }) =>
      callPlannerApi.markCompleted(id, data),
    onSuccess: (updatedPlan, variables) => {
      queryClient.setQueryData([CALL_PLANS_QUERY_KEY, variables.id], updatedPlan);
      queryClient.invalidateQueries({ 
        queryKey: [CALL_PLANS_QUERY_KEY],
        exact: false,
        refetchType: 'active',
      });
      toast.success("Call plan marked as completed");
      queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to mark call plan as completed");
    },
  });
}

export function useDeleteCallPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => callPlannerApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CALL_PLANS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
      toast.success("Call plan deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete call plan");
    },
  });
}
