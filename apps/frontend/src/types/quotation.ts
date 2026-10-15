export interface Quotation {
  id: number;
  companyId: number;
  quoteNumber: string;
  version: number;
  customerId: number;
  salesRepId: number;
  leadId: number | null;
  totalPrice: string;
  discount: string | null;
  notes: string | null;
  status: QuotationStatus;
  supersededBy: number | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: number;
    companyName: string;
    countyName: string;
    locationAddress: string;
  };
  salesRep: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  lead: {
    id: number;
    generatorRecommended: string | null;
    status: string;
  } | null;
}

export type QuotationStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "SUPERSEDED";

export interface CreateQuotationInput {
  customerId: number;
  salesRepId?: number;
  leadId?: number;
  totalPrice: number;
  discount?: number;
  notes?: string;
  status?: QuotationStatus;
}

export interface UpdateQuotationInput {
  totalPrice?: number;
  discount?: number;
  notes?: string;
  status?: QuotationStatus;
}

export interface CreateNewVersionInput {
  totalPrice?: number;
  discount?: number;
  notes?: string;
}

export interface ListQuotationsParams {
  customerId?: number;
  leadId?: number;
  salesRepId?: number;
  status?: QuotationStatus;
  page?: number;
  limit?: number;
}

export interface QuotationsResponse {
  quotations: Quotation[];
  total: number;
  page: number;
  limit: number;
}

export const QUOTATION_STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "SUPERSEDED", label: "Superseded" },
] as const;
