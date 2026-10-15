import { http } from "@/lib/http";
import type {
  Customer,
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomersResponse,
} from "../types/index";

interface ListCustomersParams {
  salesRepId?: number;
  page?: number;
  limit?: number;
}

export const customersApi = {
  list: async (params?: ListCustomersParams): Promise<CustomersResponse> => {
    const response = await http.get<CustomersResponse>("/api/customers", { params });
    return response.data;
  },

  getById: async (id: number): Promise<Customer> => {
    const response = await http.get<Customer>(`/api/customers/${id}`);
    return response.data;
  },

  create: async (data: CreateCustomerInput): Promise<Customer> => {
    const response = await http.post<Customer>("/api/customers", data);
    return response.data;
  },

  update: async (id: number, data: UpdateCustomerInput): Promise<Customer> => {
    const response = await http.patch<Customer>(`/api/customers/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await http.delete(`/api/customers/${id}`);
  },

  assignSalesRep: async (
    id: number,
    salesRepId: number
  ): Promise<Customer> => {
    const response = await http.patch<Customer>(`/api/customers/${id}/assign`, {
      salesRepId,
    });
    return response.data;
  },
};
