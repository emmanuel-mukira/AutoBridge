import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerService } from "../services/customerService";
import type { CustomerFilters, CreateCustomerInput, UpdateCustomerInput } from "../types";
import { ANALYTICS_QUERY_KEY } from "../../analytics/queryKeys";
import { toast } from "sonner";

export const customerKeys = {
  all: ["customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  list: (filters: CustomerFilters) => [...customerKeys.lists(), filters] as const,
  details: () => [...customerKeys.all, "detail"] as const,
  detail: (id: number) => [...customerKeys.details(), id] as const,
};

export function useCustomers(filters: CustomerFilters = {}) {
  return useQuery({
    queryKey: customerKeys.list(filters),
    queryFn: () => customerService.list(filters),
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
  });
}

export function useCustomer(id: number) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => customerService.getById(id),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerInput) => customerService.create(data),
    onSuccess: () => {
      toast.success("Customer created successfully");
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create customer");
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCustomerInput }) =>
      customerService.update(id, data),
    onSuccess: (data) => {
      toast.success("Customer updated successfully");
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update customer");
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => customerService.delete(id),
    onSuccess: () => {
      toast.success("Customer deleted successfully");
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ANALYTICS_QUERY_KEY });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete customer");
    },
  });
}

export function useAssignCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, salesRepId }: { id: number; salesRepId: number }) =>
      customerService.assignSalesRep(id, salesRepId),
    onSuccess: (data) => {
      toast.success("Customer reassigned successfully");
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(data.id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reassign customer");
    },
  });
}

export function useAssignSalesRep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, salesRepId }: { customerId: number; salesRepId: number }) =>
      customerService.assignSalesRep(customerId, salesRepId),
    onSuccess: (data) => {
      toast.success("Sales rep assigned successfully");
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerKeys.detail(data.id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to assign sales rep");
    },
  });
}
