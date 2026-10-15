import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../services/analyticsApi';
import { useDateRange } from '../store/analyticsStore';
import { ANALYTICS_QUERY_KEY } from '../queryKeys';
import type { DashboardData } from '../types';

export function useAnalytics() {
  const dateRange = useDateRange();

  return useQuery<DashboardData>({
    queryKey: [
      ...ANALYTICS_QUERY_KEY,
      'dashboard',
      dateRange.from.toISOString(),
      dateRange.to.toISOString(),
    ],
    queryFn: async () => {
      const dateParams = { startDate: dateRange.from, endDate: dateRange.to };
      const [leads, customers, salesRepPerformance, events] = await Promise.all([
        analyticsApi.getLeadsSummary(dateParams),
        analyticsApi.getCustomersSummary(dateParams),
        analyticsApi.getSalesRepPerformance(dateParams).catch(() => []),
        analyticsApi.getEventCounts(dateParams).catch(() => []),
      ]);

      return {
        leads,
        customers,
        salesRepPerformance,
        events,
        isAdmin: leads.isAdmin,
      };
    },
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
  });
}
