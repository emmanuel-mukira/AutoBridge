export interface CustomerContact {
  id: number;
  clientId: number;
  firstName: string;
  lastName: string;
  title?: string;
  email?: string;
  phone?: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerContactInput {
  clientId: number;
  firstName: string;
  lastName: string;
  title?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
}

export interface UpdateCustomerContactInput {
  firstName?: string;
  lastName?: string;
  title?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
}

export interface ListCustomerContactsParams {
  clientId?: number;
  page?: number;
  limit?: number;
}

export interface CustomerContactsResponse {
  contacts: CustomerContact[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}
