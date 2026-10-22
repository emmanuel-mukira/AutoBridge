import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { quotationsApi } from "@/services/quotations";
import { ANALYTICS_QUERY_KEY } from "../../analytics/queryKeys";
import { toast } from "sonner";
import type {
  CreateQuotationInput,
  UpdateQuotationInput,
  CreateNewVersionInput,
  ListQuotationsParams,
} from "@/types/quotation";

const QUOTATIONS_QUERY_KEY = "quotations";

export function useQuotations(params?: ListQuotationsParams) {
  return useQuery({
    queryKey: [QUOTATIONS_QUERY_KEY, params],
    queryFn: () => quotationsApi.list(params),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useQuotation(id: number) {
  return useQuery({
    queryKey: [QUOTATIONS_QUERY_KEY, id],
    queryFn: () => quotationsApi.getById(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useQuotationVersionHistory(quoteNumber: string) {
  return useQuery({
    queryKey: [QUOTATIONS_QUERY_KEY, "history", quoteNumber],
    queryFn: () => quotationsApi.getVersionHistory(quoteNumber),
    enabled: !!quoteNumber,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreateQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateQuotationInput) => quotationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUOTATIONS_QUERY_KEY],
        exact: false,
        refetchType: "active",
      });
      toast.success("Quotation created successfully");
      queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create quotation");
    },
  });
}

export function useUpdateQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateQuotationInput }) =>
      quotationsApi.update(id, data),
    onSuccess: (updatedQuotation, variables) => {
      queryClient.setQueryData([QUOTATIONS_QUERY_KEY, variables.id], updatedQuotation);
      queryClient.invalidateQueries({
        queryKey: [QUOTATIONS_QUERY_KEY],
        exact: false,
        refetchType: "active",
      });
      toast.success("Quotation updated successfully");
      queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update quotation");
    },
  });
}

export function useDeleteQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => quotationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUOTATIONS_QUERY_KEY],
        exact: false,
        refetchType: "active",
      });
      toast.success("Quotation deleted successfully");
      queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete quotation");
    },
  });
}

export function useCreateQuotationVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateNewVersionInput }) =>
      quotationsApi.createNewVersion(id, data),
    onSuccess: (newVersion) => {
      queryClient.invalidateQueries({
        queryKey: [QUOTATIONS_QUERY_KEY],
        exact: false,
        refetchType: "active",
      });
      queryClient.invalidateQueries({
        queryKey: [QUOTATIONS_QUERY_KEY, "history", newVersion.quoteNumber],
      });
      toast.success(`Version ${newVersion.version} created successfully`);
      queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create new version");
    },
  });
}
