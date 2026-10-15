export type CustomerCategory =
  | "SACCOS_BANKS"
  | "SCHOOLS"
  | "CHURCHES"
  | "HOSPITALS"
  | "HOTELS"
  | "NGOS"
  | "INDUSTRIAL"
  | "DOMESTIC"
  | "FARMING_DAIRY"
  | "SUPERMARKETS"
  | "PETROL_STATIONS"
  | "APARTMENTS_COMMERCIALS";

export interface Customer {
  id: number;
  companyName: string;
  countyName: string;
  locationAddress: string;
  shortHistory?: string;
  category?: CustomerCategory;
  salesRepId: number;
  companyId: number;
  createdAt: string;
  updatedAt: string;
  salesRep?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreateCustomerInput {
  companyName: string;
  countyName: string;
  locationAddress: string;
  shortHistory?: string;
  category?: CustomerCategory;
  salesRepId?: number;
}

export interface UpdateCustomerInput {
  companyName?: string;
  countyName?: string;
  locationAddress?: string;
  shortHistory?: string;
  category?: CustomerCategory;
  salesRepId?: number | null;
}

export interface CustomerFilters {
  salesRepId?: number;
  countyName?: string;
  category?: CustomerCategory;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CustomersResponse {
  customers: Customer[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CustomerDetails extends Customer {
  contacts: CustomerContact[];
  _count: {
    leads: number;
    quotations: number;
    callPlans: number;
    interactions: number;
  };
}

export interface CustomerContact {
  id: number;
  customerId: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SalesRepHistoryEntry {
  id: string;
  type: "ASSIGNMENT" | "INTERACTION" | "QUOTATION" | "LEAD";
  date: string;
  salesRepId: number;
  salesRep: {
    id: number;
    firstName: string;
    lastName: string;
  };
  description: string;
}

export interface InteractionsByRep {
  salesRepId: number;
  salesRep: {
    id: number;
    firstName: string;
    lastName: string;
  };
  interactionCount: number;
  latestInteraction: string;
}
