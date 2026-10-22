export interface Contact {
  id: number;
  clientId: number;
  firstName: string;
  lastName: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContactInput {
  clientId: number;
  firstName: string;
  lastName: string;
  title?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
}

export type ContactUpdate = Omit<Partial<ContactInput>, "clientId">;

export interface ContactsResponse {
  contacts: Contact[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}
