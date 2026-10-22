import { http } from "@/lib/http";

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

export const clientsApi = {
  list: async () => (await http.get<{ clients: Client[] }>("/api/clients", { params: { limit: 100 } })).data,
  getById: async (id: number) => (await http.get<Client>(`/api/clients/${id}`)).data,
  create: async (input: ClientInput) => (await http.post<Client>("/api/clients", input)).data,
  update: async (id: number, input: ClientInput) => (await http.patch<Client>(`/api/clients/${id}`, input)).data,
  owners: async () => (await http.get<{ owners: ClientOwner[] }>("/api/clients/owners")).data.owners,
};
