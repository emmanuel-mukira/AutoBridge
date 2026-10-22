import { http } from "@/lib/http";
import type { AnalyticsFilters, AnalyticsOverview, DateRangeFilter } from "../types";

export const analyticsApi = {
  overview: async (dateRange: DateRangeFilter, filters: AnalyticsFilters): Promise<AnalyticsOverview> => (
    await http.get<AnalyticsOverview>("/api/analytics/overview", {
      params: { startDate: dateRange.from.toISOString(), endDate: dateRange.to.toISOString(), ...filters },
    })
  ).data,
};
