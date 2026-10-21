import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { opportunitiesApi, type OpportunityFilters, type OpportunityInput, type OpportunityOutcome, type OpportunityStage } from "../services/opportunitiesApi";

const keys = {
  all: ["opportunities"] as const,
  list: (filters: OpportunityFilters) => ["opportunities", "list", filters] as const,
  detail: (id: number) => ["opportunities", "detail", id] as const,
  products: ["opportunities", "products"] as const,
  owners: ["opportunities", "owners"] as const,
};

export const useOpportunities = (filters: OpportunityFilters = {}) => useQuery({ queryKey: keys.list(filters), queryFn: () => opportunitiesApi.list(filters) });
export const useOpportunity = (id: number) => useQuery({ queryKey: keys.detail(id), queryFn: () => opportunitiesApi.getById(id), enabled: Number.isInteger(id) && id > 0 });
export const useOpportunityProducts = () => useQuery({ queryKey: keys.products, queryFn: opportunitiesApi.products });
export const useOpportunityOwners = () => useQuery({ queryKey: keys.owners, queryFn: opportunitiesApi.owners });

export function useSaveOpportunity() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: OpportunityInput }) => id ? opportunitiesApi.update(id, input) : opportunitiesApi.create(input),
    onSuccess: (opportunity) => {
      client.invalidateQueries({ queryKey: keys.all });
      client.setQueryData(keys.detail(opportunity.id), opportunity);
    },
  });
}

export function useTransitionOpportunity() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage, outcome }: { id: number; stage: OpportunityStage; outcome?: OpportunityOutcome }) => opportunitiesApi.transition(id, stage, outcome),
    onSuccess: (opportunity) => {
      client.invalidateQueries({ queryKey: keys.all });
      client.setQueryData(keys.detail(opportunity.id), opportunity);
      toast.success(`Moved to ${opportunity.stage.toLowerCase().replace("_", " ")}`);
    },
    onError: (error) => toast.error(error.message),
  });
}
