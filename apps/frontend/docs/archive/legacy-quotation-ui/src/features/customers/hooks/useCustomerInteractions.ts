import { useQuery } from "@tanstack/react-query";
import { http } from "@/lib/http";

interface Interaction {
  id: number;
  customerId: number;
  salesRepId: number;
  contactId: number | null;
  type: string;
  notes: string;
  interactionDate: string;
  createdAt: string;
  salesRep: {
    id: number;
    firstName: string;
    lastName: string;
  };
  contact: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
}

export function useCustomerInteractions(customerId: number) {
  return useQuery({
    queryKey: ["customer-interactions", customerId],
    queryFn: async () => {
      const response = await http.get<Interaction[]>(`/api/interactions/customer/${customerId}`);
      return response.data;
    },
    enabled: !!customerId,
  });
}
