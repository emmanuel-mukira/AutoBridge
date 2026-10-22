import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contactsApi } from "@/services/contactsApi";
import type { ContactInput, ContactUpdate } from "@/types/contact";

const keys = { client: (clientId: number) => ["contacts", "client", clientId] as const };

export const useContacts = (clientId?: number) => useQuery({
  queryKey: keys.client(clientId ?? 0),
  queryFn: () => contactsApi.list(clientId!),
  enabled: !!clientId,
});

export function useCreateContact() {
  const client = useQueryClient();
  return useMutation({ mutationFn: contactsApi.create, onSuccess: (contact) => client.invalidateQueries({ queryKey: keys.client(contact.clientId) }) });
}

export function useUpdateContact(clientId: number) {
  const client = useQueryClient();
  return useMutation({ mutationFn: ({ id, input }: { id: number; input: ContactUpdate }) => contactsApi.update(id, input), onSuccess: () => client.invalidateQueries({ queryKey: keys.client(clientId) }) });
}

export function useDeleteContact(clientId: number) {
  const client = useQueryClient();
  return useMutation({ mutationFn: contactsApi.delete, onSuccess: () => client.invalidateQueries({ queryKey: keys.client(clientId) }) });
}

export type { ContactInput };
