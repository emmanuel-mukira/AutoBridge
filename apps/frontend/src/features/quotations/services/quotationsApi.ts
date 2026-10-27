import { http } from "@/lib/http";

export type QuotationStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "SUPERSEDED";

export interface CatalogueProduct {
  id: number;
  productSubgroupId: number;
  sku: string;
  name: string;
  description: string | null;
  brand: string | null;
  specifications: string | null;
  unitOfMeasure: string;
  defaultSellingPrice: string;
  currency: "KES";
  priceSourceName: string;
  priceClassification:
    | "PUBLIC_RETAIL_REFERENCE"
    | "VERIFIED_TRADE"
    | "DEMONSTRATION";
  active: boolean;
  productSubgroup: {
    id: number;
    name: string;
    productGroup: { id: number; name: string };
  };
}

export interface QuotationItem {
  id: number;
  productId: number;
  skuSnapshot: string;
  productNameSnapshot: string;
  brandSnapshot: string | null;
  descriptionSnapshot: string | null;
  unitSnapshot: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
  product: { id: number; active: boolean };
}

export interface Quotation {
  id: number;
  quoteNumber: string;
  opportunityId: number;
  clientId: number;
  contactId: number | null;
  createdById: number;
  version: number;
  supersedesId: number | null;
  status: QuotationStatus;
  current: boolean;
  currency: "KES";
  issueDate: string | null;
  validUntil: string;
  subtotal: string;
  discountPercent: string;
  discountAmount: string;
  totalAmount: string;
  clientNameSnapshot: string;
  clientAddressSnapshot: string;
  contactNameSnapshot: string | null;
  notes: string | null;
  terms: string | null;
  sentAt: string | null;
  decidedAt: string | null;
  supersededAt: string | null;
  createdAt: string;
  updatedAt: string;
  opportunity: {
    id: number;
    title: string;
    ownerId: number;
    clientId: number;
    productSubgroupId: number | null;
    owner: { id: number; firstName: string; lastName: string };
  };
  client: { id: number; businessName: string };
  contact: {
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  } | null;
  createdBy: { id: number; firstName: string; lastName: string; email: string };
  items: QuotationItem[];
  supersedes: {
    id: number;
    quoteNumber: string;
    version: number;
    status: QuotationStatus;
  } | null;
  supersededBy: {
    id: number;
    quoteNumber: string;
    version: number;
    status: QuotationStatus;
  } | null;
}

export interface QuotationDraftInput {
  contactId?: number | null;
  validUntil: string;
  discountPercent: string;
  notes?: string | null;
  terms?: string | null;
  items: { productId: number; quantity: string }[];
}

export type QuotationFilters = {
  opportunityId?: number;
  clientId?: number;
  ownerId?: number;
  status?: QuotationStatus;
  search?: string;
  from?: string;
  to?: string;
};

export const quotationsApi = {
  products: async (
    filters: {
      search?: string;
      productSubgroupId?: number;
      productGroupId?: number;
      active?: "true" | "false" | "all";
    } = {},
  ) =>
    (
      await http.get<{ products: CatalogueProduct[] }>("/api/products", {
        params: filters,
      })
    ).data.products,
  list: async (filters: QuotationFilters = {}) =>
    (
      await http.get<{ quotations: Quotation[] }>("/api/quotations", {
        params: filters,
      })
    ).data.quotations,
  getById: async (id: number) =>
    (await http.get<Quotation>(`/api/quotations/${id}`)).data,
  update: async (id: number, input: QuotationDraftInput) =>
    (await http.patch<Quotation>(`/api/quotations/${id}`, input)).data,
  revise: async (id: number) =>
    (await http.post<Quotation>(`/api/quotations/${id}/revisions`)).data,
  updateStatus: async (id: number, status: "SENT" | "ACCEPTED" | "REJECTED") =>
    (await http.patch<Quotation>(`/api/quotations/${id}/status`, { status }))
      .data,
};
