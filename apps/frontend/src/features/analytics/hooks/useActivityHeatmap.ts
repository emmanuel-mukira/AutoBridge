import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';
import { ANALYTICS_QUERY_KEY } from '../queryKeys';

export function useActivityHeatmap(year: number, month: number) {
  return useQuery<number[][]>({
    queryKey: [...ANALYTICS_QUERY_KEY, 'heatmap', year, month],
    queryFn: async () => {
      const response = await http.get<number[][]>(
        `/api/analytics/event-heatmap?year=${year}&month=${month}`,
      );
      return response.data;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
