import { http } from "@/lib/http";
import type { Contact, ContactInput, ContactsResponse, ContactUpdate } from "@/types/contact";

export const contactsApi = {
  list: async (accountId: number) => (await http.get<ContactsResponse>("/api/contacts", { params: { accountId, limit: 100 } })).data,
  create: async (input: ContactInput) => (await http.post<Contact>("/api/contacts", input)).data,
  update: async (id: number, input: ContactUpdate) => (await http.patch<Contact>(`/api/contacts/${id}`, input)).data,
  delete: async (id: number) => { await http.delete(`/api/contacts/${id}`); },
};
