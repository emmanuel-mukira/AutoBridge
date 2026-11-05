import { create } from 'zustand';
import type { DateRangeFilter, QuickFilterType } from '../types';

interface AnalyticsState {
  dateRange: DateRangeFilter;
}

interface AnalyticsActions {
  setDateRange: (range: DateRangeFilter) => void;
  setQuickFilter: (type: QuickFilterType) => void;
  reset: () => void;
}

type AnalyticsStore = AnalyticsState & AnalyticsActions;

const KENYA_TIMEZONE = "Africa/Nairobi";
const KENYA_OFFSET_MINUTES = 180;

interface KenyaDateParts {
  year: number;
  month: number;
  day: number;
}

const kenyaPartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: KENYA_TIMEZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

const getKenyaDateParts = (date: Date): KenyaDateParts => {
  const parts = kenyaPartsFormatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? 0);
  const month = Number(parts.find((part) => part.type === "month")?.value ?? 1) - 1;
  const day = Number(parts.find((part) => part.type === "day")?.value ?? 1);
  return { year, month, day };
};

const toKenyaDate = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
): Date =>
  new Date(
    Date.UTC(year, month, day, hour, minute, second, millisecond) -
      KENYA_OFFSET_MINUTES * 60 * 1000,
  );

const getDefaultDateRange = (): DateRangeFilter => {
  const now = new Date();
  const { year, month } = getKenyaDateParts(now);
  return {
    from: toKenyaDate(year, month, 1, 0, 0, 0, 0),
    to: toKenyaDate(year, month + 1, 0, 23, 59, 59, 999),
  };
};

export const useAnalyticsStore = create<AnalyticsStore>((set) => ({
  dateRange: getDefaultDateRange(),

  setDateRange: (range) => set({ dateRange: range }),

  setQuickFilter: (type) => {
    const now = new Date();
    let from: Date;
    let to: Date;

    const { year, month, day } = getKenyaDateParts(now);
    switch (type) {
      case 'today':
        from = toKenyaDate(year, month, day, 0, 0, 0, 0);
        to = toKenyaDate(year, month, day, 23, 59, 59, 999);
        break;
      case 'week':
        from = toKenyaDate(year, month, day - 7, 0, 0, 0, 0);
        to = toKenyaDate(year, month, day, 23, 59, 59, 999);
        break;
      case 'month':
        // Current month only (e.g., Jan 1 - Jan 31)
        from = toKenyaDate(year, month, 1, 0, 0, 0, 0);
        to = toKenyaDate(year, month + 1, 0, 23, 59, 59, 999);
        break;
      case 'quarter': {
        const quarterStartMonth = Math.floor(month / 3) * 3;
        from = toKenyaDate(year, quarterStartMonth, 1, 0, 0, 0, 0);
        to = toKenyaDate(year, quarterStartMonth + 3, 0, 23, 59, 59, 999);
        break;
      }
      case 'half-year':
        // Last 6 months
        from = toKenyaDate(year, month - 5, 1, 0, 0, 0, 0);
        to = toKenyaDate(year, month + 1, 0, 23, 59, 59, 999);
        break;
      case 'year':
        from = toKenyaDate(year, 0, 1, 0, 0, 0, 0);
        to = toKenyaDate(year + 1, 0, 0, 23, 59, 59, 999);
        break;
      case 'max':
        from = toKenyaDate(2020, 0, 1, 0, 0, 0, 0);
        to = toKenyaDate(year, month + 1, 0, 23, 59, 59, 999);
        break;
      default:
        from = toKenyaDate(year, month, day - 30, 0, 0, 0, 0);
        to = toKenyaDate(year, month, day, 23, 59, 59, 999);
    }

    set({ dateRange: { from, to } });
  },

  reset: () => set({ dateRange: getDefaultDateRange() }),
}));

// Optimized selectors to prevent unnecessary rerenders
// Components should only subscribe to the specific state they need
export const useDateRange = () => useAnalyticsStore((state) => state.dateRange);
export const useDateRangeFrom = () => useAnalyticsStore((state) => state.dateRange.from);
export const useDateRangeTo = () => useAnalyticsStore((state) => state.dateRange.to);
export const useSetDateRange = () => useAnalyticsStore((state) => state.setDateRange);
export const useSetQuickFilter = () => useAnalyticsStore((state) => state.setQuickFilter);
