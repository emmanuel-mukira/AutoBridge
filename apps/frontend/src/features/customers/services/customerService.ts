import { http } from "@/lib/http";
import type {
  CreateCustomerInput,
  Customer,
  CustomerFilters,
  CustomersResponse,
  UpdateCustomerInput,
} from "../types";

const BASE_URL = "/api/customers";

export const customerService = {
  list: async (filters?: CustomerFilters): Promise<CustomersResponse> => {
    const params = new URLSearchParams();
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.search) params.append("search", filters.search);
    if (filters?.countyName) params.append("countyName", filters.countyName);
    if (filters?.salesRepId) params.append("salesRepId", filters.salesRepId.toString());

    const res = await http.get<CustomersResponse>(`${BASE_URL}?${params.toString()}`);
    return res.data;
  },

  getById: async (id: number): Promise<Customer> => {
    const res = await http.get<Customer>(`${BASE_URL}/${id}`);
    return res.data;
  },

  create: async (data: CreateCustomerInput): Promise<Customer> => {
    const res = await http.post<Customer>(BASE_URL, data);
    return res.data;
  },

  update: async (id: number, data: UpdateCustomerInput): Promise<Customer> => {
    const res = await http.patch<Customer>(`${BASE_URL}/${id}`, data);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await http.delete(`${BASE_URL}/${id}`);
  },

  assignSalesRep: async (id: number, salesRepId: number): Promise<Customer> => {
    const res = await http.patch<Customer>(`${BASE_URL}/${id}/assign`, { salesRepId });
    return res.data;
  },
};
