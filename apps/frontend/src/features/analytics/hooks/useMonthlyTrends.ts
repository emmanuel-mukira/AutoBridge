import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../services/analyticsApi';
import type { EventSeriesEntry } from '../services/analyticsApi';
import { useDateRange } from '../store/analyticsStore';
import { ANALYTICS_QUERY_KEY } from '../queryKeys';

interface MonthlyTrendData {
  month: string;
  year: number;
  created: number;
  won: number;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Build a lookup map from event series keyed by a normalized date string.
 */
function buildLookup(series: EventSeriesEntry[], unit: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of series) {
    const d = new Date(entry.t);
    const key = unit === "day"
      ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      : `${d.getFullYear()}-${d.getMonth()}`;
    map.set(key, (map.get(key) ?? 0) + entry.y);
  }
  return map;
}

/**
 * Generate a complete timeline covering from → to, filling gaps with 0.
 */
function buildTimeline(
  from: Date,
  to: Date,
  unit: string,
  createdMap: Map<string, number>,
  wonMap: Map<string, number>,
): MonthlyTrendData[] {
  const result: MonthlyTrendData[] = [];
  if (unit === "day") {
    const cursor = new Date(from);
    while (cursor <= to) {
      const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
      const monthLabel = MONTH_LABELS[cursor.getMonth()];
      result.push({
        month: `${cursor.getDate()} ${monthLabel}`,
        year: cursor.getFullYear(),
        created: createdMap.get(key) ?? 0,
        won: wonMap.get(key) ?? 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
  } else {
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const endMonth = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cursor <= endMonth) {
      const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
      result.push({
        month: MONTH_LABELS[cursor.getMonth()],
        year: cursor.getFullYear(),
        created: createdMap.get(key) ?? 0,
        won: wonMap.get(key) ?? 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }
  return result;
}

/**
 * Fetches lead_created and lead_won event series from TimescaleDB,
 * transforms into MonthlyTrendData[] for the chart.
 * Generates a complete timeline so the chart shows the full date range.
 */
export function useMonthlyTrends() {
  const dateRange = useDateRange();

  return useQuery<MonthlyTrendData[]>({
    queryKey: [
      ...ANALYTICS_QUERY_KEY,
      'monthly-trends',
      dateRange.from.toISOString(),
      dateRange.to.toISOString(),
    ],
    queryFn: async () => {
      const diffMs = dateRange.to.getTime() - dateRange.from.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      const unit = diffDays > 90 ? "month" : "day";

      const grouped = await analyticsApi.getEventSeries(
        dateRange.from,
        dateRange.to,
        unit,
      );

      const createdMap = buildLookup(grouped.lead_created ?? [], unit);
      const wonMap = buildLookup(grouped.lead_won ?? [], unit);

      // For month view, start timeline from earliest data point (not filter start)
      // to avoid generating dozens of empty months when "max" filter starts from 2020
      let effectiveFrom = dateRange.from;
      if (unit === "month") {
        const allEntries = [
          ...(grouped.lead_created ?? []),
          ...(grouped.lead_won ?? []),
        ];
        if (allEntries.length > 0) {
          const earliest = allEntries.reduce((min, e) =>
            e.t < min ? e.t : min, allEntries[0].t);
          const earliestDate = new Date(earliest);
          if (earliestDate > effectiveFrom) {
            effectiveFrom = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
          }
        }
      }

      return buildTimeline(effectiveFrom, dateRange.to, unit, createdMap, wonMap);
    },
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    placeholderData: (prev) => prev,
  });
}
