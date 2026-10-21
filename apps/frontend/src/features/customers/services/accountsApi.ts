import { http } from "@/lib/http";

export interface Account {
  id: number;
  businessName: string;
  countyName: string;
  locationAddress: string;
  shortHistory: string | null;
  ownerId: number;
  owner: { id: number; firstName: string; lastName: string; email: string };
}

export interface AccountInput {
  businessName: string;
  countyName: string;
  locationAddress: string;
  shortHistory?: string;
}

export const accountsApi = {
  list: async () => (await http.get<{ accounts: Account[] }>("/api/accounts")).data,
  getById: async (id: number) => (await http.get<Account>(`/api/accounts/${id}`)).data,
  create: async (input: AccountInput) => (await http.post<Account>("/api/accounts", input)).data,
  update: async (id: number, input: AccountInput) => (await http.patch<Account>(`/api/accounts/${id}`, input)).data,
};
