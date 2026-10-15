export interface CustomerContact {
  id: number;
  companyId: number;
  customerId: number;
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
  customerId: number;
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
  customerId?: number;
  page?: number;
  limit?: number;
}

export interface CustomerContactsResponse {
  contacts: CustomerContact[];
  total: number;
  page: number;
  limit: number;
}
