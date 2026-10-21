import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contactsApi } from "@/services/contactsApi";
import type { ContactInput, ContactUpdate } from "@/types/contact";

const keys = { account: (accountId: number) => ["contacts", "account", accountId] as const };

export const useContacts = (accountId?: number) => useQuery({
  queryKey: keys.account(accountId ?? 0),
  queryFn: () => contactsApi.list(accountId!),
  enabled: !!accountId,
});

export function useCreateContact() {
  const client = useQueryClient();
  return useMutation({ mutationFn: contactsApi.create, onSuccess: (contact) => client.invalidateQueries({ queryKey: keys.account(contact.accountId) }) });
}

export function useUpdateContact(accountId: number) {
  const client = useQueryClient();
  return useMutation({ mutationFn: ({ id, input }: { id: number; input: ContactUpdate }) => contactsApi.update(id, input), onSuccess: () => client.invalidateQueries({ queryKey: keys.account(accountId) }) });
}

export function useDeleteContact(accountId: number) {
  const client = useQueryClient();
  return useMutation({ mutationFn: contactsApi.delete, onSuccess: () => client.invalidateQueries({ queryKey: keys.account(accountId) }) });
}

export type { ContactInput };
