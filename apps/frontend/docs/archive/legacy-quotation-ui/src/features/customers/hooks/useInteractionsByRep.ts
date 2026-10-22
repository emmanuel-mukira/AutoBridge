import { useQuery } from "@tanstack/react-query";
import { http } from "@/lib/http";
import type { InteractionsByRep } from "../types";

export function useInteractionsByRep(customerId: number) {
  return useQuery({
    queryKey: ["customer-interactions-by-rep", customerId],
    queryFn: async () => {
      const response = await http.get<InteractionsByRep[]>(`/api/customers/${customerId}/interactions-by-rep`);
      return response.data;
    },
    enabled: !!customerId,
  });
}
