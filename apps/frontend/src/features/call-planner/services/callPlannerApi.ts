import { http } from "@/lib/http";
import type {
  CallPlan,
  CreateCallPlanInput,
  UpdateCallPlanInput,
  MarkCompletedInput,
  ListCallPlansParams,
  CallPlansResponse,
} from "../types";

export const callPlannerApi = {
  list: async (params?: ListCallPlansParams): Promise<CallPlansResponse> => {
    const response = await http.get<CallPlansResponse>("/api/call-plans", { params });
    return response.data;
  },

  getById: async (id: number): Promise<CallPlan> => {
    const response = await http.get<CallPlan>(`/api/call-plans/${id}`);
    return response.data;
  },

  create: async (data: CreateCallPlanInput): Promise<CallPlan> => {
    const response = await http.post<CallPlan>("/api/call-plans", data);
    return response.data;
  },

  update: async (id: number, data: UpdateCallPlanInput): Promise<CallPlan> => {
    const response = await http.patch<CallPlan>(`/api/call-plans/${id}`, data);
    return response.data;
  },

  markCompleted: async (id: number, data: MarkCompletedInput): Promise<CallPlan> => {
    const response = await http.patch<CallPlan>(`/api/call-plans/${id}/complete`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await http.delete(`/api/call-plans/${id}`);
  },
};
