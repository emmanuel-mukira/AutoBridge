import { http } from "@/lib/http";

export type OpportunityStage = "NEW" | "QUALIFYING" | "PROPOSAL" | "NEGOTIATION" | "CLOSED";
export type SalesRoute = "FIELDS_SALES" | "OTHER" | "RESELLER" | "TELECOVERAGE" | "TELESALES";
export type Currency = "KES" | "USD";
export type OpportunityOutcome = "WON" | "LOST";

export interface Opportunity {
  id: number;
  accountId: number;
  ownerId: number;
  productSubgroupId: number | null;
  title: string;
  estimatedAmount: string;
  currency: Currency;
  routeToMarket: SalesRoute | null;
  stage: OpportunityStage;
  outcome: OpportunityOutcome | null;
  outcomeAt: string | null;
  estimatedCloseAt: string | null;
  estimatedAt: string;
  createdAt: string;
  updatedAt: string;
  account: { id: number; businessName: string };
  owner: { id: number; firstName: string; lastName: string; email: string; role: "ADMIN" | "SALES_REP" };
  productSubgroup: { id: number; name: string; productGroup: { id: number; name: string } } | null;
}

export interface OpportunityInput {
  accountId: number;
  ownerId?: number;
  productSubgroupId?: number | null;
  title: string;
  estimatedAmount: string;
  currency: Currency;
  routeToMarket?: SalesRoute | null;
  estimatedCloseAt?: string | null;
}

export interface OpportunityFilters {
  search?: string;
  stage?: OpportunityStage;
  accountId?: number;
  ownerId?: number;
  productGroupId?: number;
  productSubgroupId?: number;
  routeToMarket?: SalesRoute;
}

export interface ProductGroup {
  id: number;
  name: string;
  subgroups: { id: number; name: string; productGroupId: number }[];
}

export interface OpportunityOwner {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "ADMIN" | "SALES_REP";
}

export const opportunitiesApi = {
  list: async (filters: OpportunityFilters = {}) => (await http.get<{ opportunities: Opportunity[]; pagination: { total: number } }>("/api/opportunities", { params: filters })).data,
  getById: async (id: number) => (await http.get<Opportunity>(`/api/opportunities/${id}`)).data,
  create: async (input: OpportunityInput) => (await http.post<Opportunity>("/api/opportunities", input)).data,
  update: async (id: number, input: Partial<OpportunityInput>) => (await http.patch<Opportunity>(`/api/opportunities/${id}`, input)).data,
  transition: async (id: number, stage: OpportunityStage, outcome?: OpportunityOutcome) => (await http.patch<Opportunity>(`/api/opportunities/${id}/stage`, { stage, ...(outcome ? { outcome } : {}) })).data,
  products: async () => (await http.get<{ productGroups: ProductGroup[] }>("/api/opportunities/products")).data.productGroups,
  owners: async () => (await http.get<{ owners: OpportunityOwner[] }>("/api/opportunities/owners")).data.owners,
};
