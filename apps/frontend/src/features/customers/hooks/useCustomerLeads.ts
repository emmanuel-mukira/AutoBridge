import { useQuery } from "@tanstack/react-query";
import { http } from "@/lib/http";

interface Lead {
  id: number;
  customerId: number;
  salesRepId: number;
  generatorRecommended: string;
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

interface LeadsResponse {
  leads: Lead[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useCustomerLeads(customerId: number) {
  return useQuery({
    queryKey: ["customer-leads", customerId],
    queryFn: async () => {
      const response = await http.get<LeadsResponse>(`/api/leads?customerId=${customerId}&limit=100`);
      return response.data;
    },
    enabled: !!customerId,
  });
}
