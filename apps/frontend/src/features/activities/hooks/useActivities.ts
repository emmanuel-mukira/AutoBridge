import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { activitiesApi, type ActivityFilters, type FollowUpInput, type InteractionInput } from "../services/activitiesApi";

const activityKey = ["activities"] as const;

export const useInteractions = (filters: ActivityFilters = {}) => useQuery({
  queryKey: [...activityKey, "interactions", filters],
  queryFn: () => activitiesApi.listInteractions(filters),
});

export const useFollowUps = (filters: ActivityFilters = {}) => useQuery({
  queryKey: [...activityKey, "follow-ups", filters],
  queryFn: () => activitiesApi.listFollowUps(filters),
});

function useActivityMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>, success: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => { client.invalidateQueries({ queryKey: activityKey }); toast.success(success); },
    onError: (error) => toast.error(error.message),
  });
}

export const useSaveInteraction = () => useActivityMutation(
  ({ id, input }: { id?: number; input: InteractionInput }) => id
    ? activitiesApi.updateInteraction(id, input)
    : activitiesApi.createInteraction(input),
  "Interaction saved",
);
export const useDeleteInteraction = () => useActivityMutation((id: number) => activitiesApi.deleteInteraction(id), "Interaction deleted");
export const useSaveFollowUp = () => useActivityMutation(
  ({ id, input }: { id?: number; input: FollowUpInput }) => id
    ? activitiesApi.updateFollowUp(id, input)
    : activitiesApi.createFollowUp(input),
  "Follow-up saved",
);
export const useCompleteFollowUp = () => useActivityMutation((id: number) => activitiesApi.completeFollowUp(id), "Follow-up completed");
