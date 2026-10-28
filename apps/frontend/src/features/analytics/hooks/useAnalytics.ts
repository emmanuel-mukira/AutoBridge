import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { analyticsApi } from "../services/analyticsApi";
import { useDateRange } from "../store/analyticsStore";
import { ANALYTICS_QUERY_KEY } from "../queryKeys";
import type { AnalyticsFilters, DecisionSupportFilters } from "../types";

export function useAnalytics(filters: AnalyticsFilters = {}) {
  const dateRange = useDateRange();
  return useQuery({
    queryKey: [...ANALYTICS_QUERY_KEY, "overview", dateRange.from.toISOString(), dateRange.to.toISOString(), filters],
    queryFn: () => analyticsApi.overview(dateRange, filters),
  });
}

export function useDecisionSupport(filters: DecisionSupportFilters = {}) {
  return useQuery({
    queryKey: [...ANALYTICS_QUERY_KEY, "decision-support", filters],
    queryFn: () => analyticsApi.decisionSupport(filters),
    placeholderData: keepPreviousData,
  });
}
