import { http } from "@/lib/http";
import type {
  Interaction,
  CreateInteractionInput,
  UpdateInteractionInput,
  ListInteractionsParams,
  InteractionsResponse,
} from "../types";

export const interactionsApi = {
  list: async (params?: ListInteractionsParams): Promise<InteractionsResponse> => {
    const response = await http.get<InteractionsResponse>("/api/interactions", { params });
    return response.data;
  },

  getById: async (id: number): Promise<Interaction> => {
    const response = await http.get<Interaction>(`/api/interactions/${id}`);
    return response.data;
  },

  getByCustomer: async (customerId: number): Promise<Interaction[]> => {
    const response = await http.get<Interaction[]>(`/api/interactions/customer/${customerId}`);
    return response.data;
  },

  create: async (data: CreateInteractionInput): Promise<Interaction> => {
    const response = await http.post<Interaction>("/api/interactions", data);
    return response.data;
  },

  update: async (id: number, data: UpdateInteractionInput): Promise<Interaction> => {
    const response = await http.patch<Interaction>(`/api/interactions/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await http.delete(`/api/interactions/${id}`);
  },
};
