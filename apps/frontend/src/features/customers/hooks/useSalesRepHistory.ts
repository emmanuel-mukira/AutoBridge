import { useQuery } from "@tanstack/react-query";
import { http } from "@/lib/http";
import type { SalesRepHistoryEntry } from "../types";

export function useSalesRepHistory(customerId: number) {
  return useQuery({
    queryKey: ["customer-sales-rep-history", customerId],
    queryFn: async () => {
      const response = await http.get<SalesRepHistoryEntry[]>(`/api/customers/${customerId}/sales-rep-history`);
      return response.data;
    },
    enabled: !!customerId,
  });
}
