export type LeadStatus = "DRAFT" | "OPEN" | "WON" | "LOST";

export interface Lead {
  id: number;
  companyId: number;
  customerId: number;
  salesRepId: number;
  generatorRecommended: string | null;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: number;
    companyName: string;
    location: string;
    industry: string;
  };
  salesRep: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreateLeadInput {
  customerId: number;
  salesRepId?: number;
  generatorRecommended?: string;
  status?: LeadStatus;
}

export interface UpdateLeadInput {
  generatorRecommended?: string;
  status?: LeadStatus;
}

export interface ListLeadsParams {
  salesRepId?: number;
  customerId?: number;
  status?: LeadStatus;
  page?: number;
  limit?: number;
}

export interface LeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
