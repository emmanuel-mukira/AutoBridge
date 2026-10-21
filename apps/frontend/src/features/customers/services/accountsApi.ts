import { http } from "@/lib/http";

export interface Account {
  id: number;
  businessName: string;
  countyName: string;
  locationAddress: string;
  shortHistory: string | null;
  ownerId: number;
  owner: { id: number; firstName: string; lastName: string; email: string };
  contacts: { id: number }[];
}

export interface AccountInput {
  businessName: string;
  countyName: string;
  locationAddress: string;
  shortHistory?: string;
  ownerId?: number;
}

export interface AccountOwner {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "ADMIN" | "SALES_REP";
}

export const accountsApi = {
  list: async () => (await http.get<{ accounts: Account[] }>("/api/accounts", { params: { limit: 100 } })).data,
  getById: async (id: number) => (await http.get<Account>(`/api/accounts/${id}`)).data,
  create: async (input: AccountInput) => (await http.post<Account>("/api/accounts", input)).data,
  update: async (id: number, input: AccountInput) => (await http.patch<Account>(`/api/accounts/${id}`, input)).data,
  owners: async () => (await http.get<{ owners: AccountOwner[] }>("/api/accounts/owners")).data.owners,
};
