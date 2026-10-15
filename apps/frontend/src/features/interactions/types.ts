export type InteractionType = "CALL" | "EMAIL" | "MEETING" | "SITE_VISIT" | "FOLLOW_UP";

export interface Interaction {
  id: number;
  companyId: number;
  customerId: number;
  salesRepId: number;
  contactId: number | null;
  leadId: number | null;
  quotationId: number | null;
  type: InteractionType;
  interactionDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: number;
    companyName: string;
    location: string;
  };
  salesRep: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  contact: {
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  } | null;
  lead: {
    id: number;
    status: string;
  } | null;
  quotation: {
    id: number;
    quotationNumber: string;
  } | null;
}

export interface CreateInteractionInput {
  customerId: number;
  salesRepId?: number;
  contactId?: number | null;
  leadId?: number | null;
  quotationId?: number | null;
  type?: InteractionType;
  interactionDate?: string;
  notes: string;
}

export interface UpdateInteractionInput {
  contactId?: number | null;
  leadId?: number | null;
  quotationId?: number | null;
  type?: InteractionType;
  interactionDate?: string;
  notes?: string;
}

export interface ListInteractionsParams {
  salesRepId?: number;
  customerId?: number;
  contactId?: number;
  leadId?: number;
  quotationId?: number;
  type?: InteractionType;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface InteractionsResponse {
  interactions: Interaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
