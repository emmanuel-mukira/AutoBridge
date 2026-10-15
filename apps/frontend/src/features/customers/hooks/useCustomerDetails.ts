import { useQuery } from "@tanstack/react-query";
import { http } from "@/lib/http";
import type { CustomerDetails } from "../types";

export function useCustomerDetails(customerId: number) {
  return useQuery({
    queryKey: ["customer", customerId],
    queryFn: async () => {
      const response = await http.get<CustomerDetails>(`/api/customers/${customerId}`);
      return response.data;
    },
    enabled: !!customerId,
  });
}
