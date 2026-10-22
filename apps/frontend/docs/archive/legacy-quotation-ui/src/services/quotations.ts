import { http } from "@/lib/http";
import type {
  Quotation,
  CreateQuotationInput,
  UpdateQuotationInput,
  CreateNewVersionInput,
  ListQuotationsParams,
  QuotationsResponse,
} from "@/types/quotation";

export const quotationsApi = {
  list: async (params?: ListQuotationsParams): Promise<QuotationsResponse> => {
    const { data } = await http.get<QuotationsResponse>("/api/quotations", { params });
    return data;
  },

  getById: async (id: number): Promise<Quotation> => {
    const { data } = await http.get<Quotation>(`/api/quotations/${id}`);
    return data;
  },

  create: async (input: CreateQuotationInput): Promise<Quotation> => {
    const { data } = await http.post<Quotation>("/api/quotations", input);
    return data;
  },

  update: async (id: number, input: UpdateQuotationInput): Promise<Quotation> => {
    const { data } = await http.patch<Quotation>(`/api/quotations/${id}`, input);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await http.delete(`/api/quotations/${id}`);
  },

  createNewVersion: async (id: number, input: CreateNewVersionInput): Promise<Quotation> => {
    const { data } = await http.post<Quotation>(`/api/quotations/${id}/version`, input);
    return data;
  },

  getVersionHistory: async (quoteNumber: string): Promise<Quotation[]> => {
    const { data } = await http.get<Quotation[]>(`/api/quotations/history/${quoteNumber}`);
    return data;
  },
};
