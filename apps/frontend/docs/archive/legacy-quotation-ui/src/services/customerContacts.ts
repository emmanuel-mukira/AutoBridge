import { http } from "@/lib/http";
import type {
  CustomerContact,
  CreateCustomerContactInput,
  UpdateCustomerContactInput,
  ListCustomerContactsParams,
  CustomerContactsResponse,
} from "@/types/customerContact";

export const customerContactsApi = {
  list: async (params?: ListCustomerContactsParams): Promise<CustomerContactsResponse> => {
    const response = await http.get<CustomerContactsResponse>("/api/contacts", { params });
    return response.data;
  },

  getById: async (id: number): Promise<CustomerContact> => {
    const response = await http.get<CustomerContact>(`/api/contacts/${id}`);
    return response.data;
  },

  create: async (data: CreateCustomerContactInput): Promise<CustomerContact> => {
    const response = await http.post<CustomerContact>("/api/contacts", data);
    return response.data;
  },

  update: async (id: number, data: UpdateCustomerContactInput): Promise<CustomerContact> => {
    const response = await http.patch<CustomerContact>(`/api/contacts/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await http.delete(`/api/contacts/${id}`);
  },
};
