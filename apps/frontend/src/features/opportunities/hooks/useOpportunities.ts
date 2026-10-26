import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { opportunitiesApi, type ConfirmedSaleInput, type OpportunityFilters, type OpportunityInput, type OpportunityOutcome, type OpportunityStage, type PredictionAssessment } from "../services/opportunitiesApi";

const keys = {
  all: ["opportunities"] as const,
  list: (filters: OpportunityFilters) => ["opportunities", "list", filters] as const,
  detail: (id: number) => ["opportunities", "detail", id] as const,
  products: ["opportunities", "products"] as const,
  owners: ["opportunities", "owners"] as const,
  predictions: (id: number) => ["opportunities", "predictions", id] as const,
};

export const useOpportunities = (filters: OpportunityFilters = {}) => useQuery({ queryKey: keys.list(filters), queryFn: () => opportunitiesApi.list(filters) });
export const useOpportunity = (id: number) => useQuery({ queryKey: keys.detail(id), queryFn: () => opportunitiesApi.getById(id), enabled: Number.isInteger(id) && id > 0 });
export const useOpportunityProducts = () => useQuery({ queryKey: keys.products, queryFn: opportunitiesApi.products });
export const useOpportunityOwners = () => useQuery({ queryKey: keys.owners, queryFn: opportunitiesApi.owners });
export const useOpportunityPredictions = (id: number) => useQuery({ queryKey: keys.predictions(id), queryFn: () => opportunitiesApi.predictions(id), enabled: Number.isInteger(id) && id > 0 });

export function useScoreOpportunity() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => opportunitiesApi.score(id),
    onSuccess: (prediction) => {
      client.invalidateQueries({ queryKey: keys.predictions(prediction.opportunityId) });
      client.invalidateQueries({ queryKey: keys.all });
      toast.success("Win probability generated");
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useReviewPrediction(opportunityId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ predictionId, assessment, comment }: { predictionId: number; assessment: PredictionAssessment; comment?: string }) =>
      opportunitiesApi.reviewPrediction(opportunityId, predictionId, { assessment, ...(comment ? { comment } : {}) }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.predictions(opportunityId) });
      toast.success("Prediction review saved");
    },
    onError: (error) => toast.error(error.message),
  });
}

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
    mutationFn: ({ id, stage, outcome, confirmedSale }: { id: number; stage: OpportunityStage; outcome?: OpportunityOutcome; confirmedSale?: ConfirmedSaleInput }) => opportunitiesApi.transition(id, stage, outcome, confirmedSale),
    onSuccess: (opportunity) => {
      client.invalidateQueries({ queryKey: keys.all });
      client.setQueryData(keys.detail(opportunity.id), opportunity);
      toast.success(`Moved to ${opportunity.stage.toLowerCase().replace("_", " ")}`);
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useCorrectConfirmedSale() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: ConfirmedSaleInput }) => opportunitiesApi.correctConfirmedSale(id, input),
    onSuccess: (opportunity) => {
      client.invalidateQueries({ queryKey: keys.all });
      client.invalidateQueries({ queryKey: ["clients", opportunity.clientId, "sales-history"] });
      client.setQueryData(keys.detail(opportunity.id), opportunity);
      toast.success("Confirmed sale value updated");
    },
    onError: (error) => toast.error(error.message),
  });
}
