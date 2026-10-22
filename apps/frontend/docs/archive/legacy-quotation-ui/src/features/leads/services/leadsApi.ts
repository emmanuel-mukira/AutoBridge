import { http } from "@/lib/http";
import type {
  Lead,
  CreateLeadInput,
  UpdateLeadInput,
  ListLeadsParams,
  LeadsResponse,
} from "../types";

export const leadsApi = {
  list: async (params?: ListLeadsParams): Promise<LeadsResponse> => {
    const response = await http.get<LeadsResponse>("/api/leads", { params });
    return response.data;
  },

  getById: async (id: number): Promise<Lead> => {
    const response = await http.get<Lead>(`/api/leads/${id}`);
    return response.data;
  },

  create: async (data: CreateLeadInput): Promise<Lead> => {
    const response = await http.post<Lead>("/api/leads", data);
    return response.data;
  },

  update: async (id: number, data: UpdateLeadInput): Promise<Lead> => {
    const response = await http.patch<Lead>(`/api/leads/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await http.delete(`/api/leads/${id}`);
  },
};
