import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerContactsApi } from "@/services/customerContacts";
import type {
  CreateCustomerContactInput,
  UpdateCustomerContactInput,
  ListCustomerContactsParams,
} from "@/types/customerContact";
import { toast } from "sonner";

export const contactKeys = {
  all: ["customer-contacts"] as const,
  lists: () => [...contactKeys.all, "list"] as const,
  list: (params: ListCustomerContactsParams) => [...contactKeys.lists(), params] as const,
  details: () => [...contactKeys.all, "detail"] as const,
  detail: (id: number) => [...contactKeys.details(), id] as const,
};

export function useCustomerContacts(params?: ListCustomerContactsParams) {
  return useQuery({
    queryKey: contactKeys.list(params || {}),
    queryFn: () => customerContactsApi.list(params),
    enabled: !!params?.customerId,
  });
}

export function useCustomerContact(id: number) {
  return useQuery({
    queryKey: contactKeys.detail(id),
    queryFn: () => customerContactsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateCustomerContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCustomerContactInput) => customerContactsApi.create(data),
    onSuccess: () => {
      toast.success("Contact created successfully");
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create contact");
    },
  });
}

export function useUpdateCustomerContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCustomerContactInput }) =>
      customerContactsApi.update(id, data),
    onSuccess: (data) => {
      toast.success("Contact updated successfully");
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contactKeys.detail(data.id) });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update contact");
    },
  });
}

export function useDeleteCustomerContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => customerContactsApi.delete(id),
    onSuccess: () => {
      toast.success("Contact deleted successfully");
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete contact");
    },
  });
}
