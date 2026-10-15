import { http } from '@/lib/http';
import type { LeadsSummary, CustomersSummary, SalesRepPerformance, EventCount } from '../types';

interface DateRangeParams {
  startDate?: Date;
  endDate?: Date;
}

export interface EventSeriesEntry {
  t: string;
  y: number;
}

function buildDateParams(params?: DateRangeParams): string {
  if (!params?.startDate && !params?.endDate) return '';
  const qs = new URLSearchParams();
  if (params.startDate) qs.append('startDate', params.startDate.toISOString());
  if (params.endDate) qs.append('endDate', params.endDate.toISOString());
  return `?${qs.toString()}`;
}

export const analyticsApi = {
  getLeadsSummary: async (params?: DateRangeParams): Promise<LeadsSummary> => {
    const response = await http.get<LeadsSummary>(`/api/analytics/leads-summary${buildDateParams(params)}`);
    return response.data;
  },

  getCustomersSummary: async (params?: DateRangeParams): Promise<CustomersSummary> => {
    const response = await http.get<CustomersSummary>(`/api/analytics/customers-summary${buildDateParams(params)}`);
    return response.data;
  },

  getSalesRepPerformance: async (params: DateRangeParams): Promise<SalesRepPerformance[]> => {
    const qs = new URLSearchParams();
    if (params.startDate) qs.append('startDate', params.startDate.toISOString());
    if (params.endDate) qs.append('endDate', params.endDate.toISOString());
    const response = await http.get<SalesRepPerformance[]>(`/api/analytics/sales-rep-performance?${qs.toString()}`);
    return response.data;
  },

  getEventCounts: async (params: DateRangeParams): Promise<EventCount[]> => {
    const qs = new URLSearchParams();
    if (params.startDate) qs.append('startDate', params.startDate.toISOString());
    if (params.endDate) qs.append('endDate', params.endDate.toISOString());
    const response = await http.get<EventCount[]>(`/api/analytics/event-counts?${qs.toString()}`);
    return response.data;
  },

  getEventSeries: async (
    startDate: Date,
    endDate: Date,
    unit: 'day' | 'month' = 'day',
  ): Promise<Record<string, EventSeriesEntry[]>> => {
    const qs = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      unit,
      timezone: 'Africa/Nairobi',
    });
    const response = await http.get<Record<string, EventSeriesEntry[]>>(
      `/api/analytics/event-series?${qs.toString()}`,
    );
    return response.data;
  },
};
