import { http } from "@/lib/http";
import type { Opportunity } from "@/features/opportunities/services/opportunitiesApi";

export interface Client {
  id: number;
  businessName: string;
  countyName: string;
  locationAddress: string;
  shortHistory: string | null;
  ownerId: number;
  owner: { id: number; firstName: string; lastName: string; email: string };
  contacts: { id: number }[];
}

export interface ClientInput {
  businessName: string;
  countyName: string;
  locationAddress: string;
  shortHistory?: string;
  ownerId?: number;
}

export interface ClientOwner {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "ADMIN" | "SALES_REP";
}

export interface ClientSalesHistory {
  client: { id: number; businessName: string };
  asOf: string;
  opportunities: Opportunity[];
  confirmedSales: {
    totalUsd: string;
    eligibleCount: number;
    missingConfirmedCount: number;
    totalsByCurrency: { currency: string; amount: string }[];
    conversionBasis: { kesPerUsd: string; source: string; observedAt: string };
  };
  revenueEvidence: {
    state: "UNKNOWN" | "VERIFIED_ZERO" | "VERIFIED_COMPLETE";
    windowStart: string;
    windowEnd: string;
    amountUsd: string | null;
    ibmRevenueCode: 0 | 1 | 2 | 3 | 4 | null;
    reviewReason: string | null;
    missingConfirmedCount: number;
    coverage: null | {
      id: number;
      coverageStart: string;
      coverageEnd: string;
      evidenceSource: string;
      declaration: "YES" | "NO" | "NOT_SURE";
      complete: boolean;
      verifiedAt: string;
      verifiedBy: { id: number; firstName: string; lastName: string } | null;
    };
  };
}

export interface RevenueCoverageInput {
  declaration: "YES" | "NO" | "NOT_SURE";
  confirmedComplete?: boolean;
}

export const clientsApi = {
  list: async () => (await http.get<{ clients: Client[] }>("/api/clients", { params: { limit: 100 } })).data,
  getById: async (id: number) => (await http.get<Client>(`/api/clients/${id}`)).data,
  create: async (input: ClientInput) => (await http.post<Client>("/api/clients", input)).data,
  update: async (id: number, input: ClientInput) => (await http.patch<Client>(`/api/clients/${id}`, input)).data,
  owners: async () => (await http.get<{ owners: ClientOwner[] }>("/api/clients/owners")).data.owners,
  salesHistory: async (id: number, asOf?: string) => (await http.get<ClientSalesHistory>(`/api/clients/${id}/sales-history`, { params: { asOf } })).data,
  verifyRevenueCoverage: async (id: number, input: RevenueCoverageInput) => (await http.post(`/api/clients/${id}/revenue-coverage`, input)).data,
};
