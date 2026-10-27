import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  quotationsApi,
  type QuotationDraftInput,
  type QuotationFilters,
} from "../services/quotationsApi";

const keys = {
  opportunity: (id: number) => ["quotations", "opportunity", id] as const,
  list: (filters: QuotationFilters) => ["quotations", "list", filters] as const,
  detail: (id: number) => ["quotations", "detail", id] as const,
  products: (
    search: string,
    subgroupId?: number,
    groupId?: number,
    active: "true" | "false" | "all" = "true",
  ) => ["catalogue-products", search, subgroupId, groupId, active] as const,
};

export const useCatalogueProducts = (
  search = "",
  productSubgroupId?: number,
  productGroupId?: number,
  active: "true" | "false" | "all" = "true",
) =>
  useQuery({
    queryKey: keys.products(search, productSubgroupId, productGroupId, active),
    queryFn: () =>
      quotationsApi.products({
        search: search || undefined,
        productSubgroupId,
        productGroupId,
        active,
      }),
  });
export const useOpportunityQuotations = (opportunityId: number) =>
  useQuery({
    queryKey: keys.opportunity(opportunityId),
    queryFn: () => quotationsApi.list({ opportunityId }),
    enabled: opportunityId > 0,
  });
export const useQuotations = (filters: QuotationFilters = {}) =>
  useQuery({
    queryKey: keys.list(filters),
    queryFn: () => quotationsApi.list(filters),
  });
export const useQuotation = (id: number) =>
  useQuery({
    queryKey: keys.detail(id),
    queryFn: () => quotationsApi.getById(id),
    enabled: Number.isInteger(id) && id > 0,
  });

export function useSaveQuotation(opportunityId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: QuotationDraftInput }) =>
      quotationsApi.update(id, input),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.opportunity(opportunityId) });
      client.invalidateQueries({ queryKey: ["quotations"] });
      client.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Quotation draft saved");
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useUpdateQuotationStatus(opportunityId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: number;
      status: "SENT" | "ACCEPTED" | "REJECTED";
    }) => quotationsApi.updateStatus(id, status),
    onSuccess: (quotation) => {
      client.invalidateQueries({ queryKey: keys.opportunity(opportunityId) });
      client.invalidateQueries({ queryKey: ["quotations"] });
      client.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success(`Quotation marked ${quotation.status.toLowerCase()}`);
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useReviseQuotation(opportunityId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: quotationsApi.revise,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.opportunity(opportunityId) });
      client.invalidateQueries({ queryKey: keys.list({}) });
      toast.success("Draft revision created");
    },
    onError: (error) => toast.error(error.message),
  });
}
