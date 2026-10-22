import { useQuery } from "@tanstack/react-query";
import { http } from "@/lib/http";

interface Quotation {
  id: number;
  quoteNumber: string;
  version: number;
  customerId: number;
  salesRepId: number;
  totalPrice: string;
  status: string;
  createdAt: string;
  customer: {
    companyName: string;
  };
  salesRep: {
    firstName: string;
    lastName: string;
  };
}

interface QuotationsResponse {
  quotations: Quotation[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useCustomerQuotations(customerId: number) {
  return useQuery({
    queryKey: ["customer-quotations", customerId],
    queryFn: async () => {
      const response = await http.get<QuotationsResponse>(`/api/quotations?customerId=${customerId}&limit=100`);
      return response.data;
    },
    enabled: !!customerId,
  });
}
