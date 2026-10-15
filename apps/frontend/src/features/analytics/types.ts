/** Backend /api/analytics/leads-summary response */
export interface LeadsSummary {
  totalLeads: number;
  wonLeads: number;
  lostLeads: number;
  openLeads: number;
  draftLeads: number;
  conversionRate: number;
  acceptedValue: number;
  isAdmin: boolean;
}

/** Backend /api/analytics/customers-summary response */
export interface CustomersSummary {
  totalCustomers: number;
  regionalDistribution: RegionalDistribution[];
}

export interface RegionalDistribution {
  region: string;
  count: number;
}

/** Backend /api/analytics/sales-rep-summary response */
export interface SalesRepPerformance {
  id: number;
  name: string;
  totalLeads: number;
  wonLeads: number;
  totalValue: number;
  conversionRate: number;
}

/** Derived from LeadsSummary for the pie chart */
export interface StatusDistribution {
  status: string;
  count: number;
}

/** Event count from TimescaleDB /api/analytics/event-counts */
export interface EventCount {
  event: string;
  count: number;
}

/** Combined dashboard data from all sources */
export interface DashboardData {
  leads: LeadsSummary;
  customers: CustomersSummary;
  salesRepPerformance: SalesRepPerformance[];
  events: EventCount[];
  isAdmin: boolean;
}

export interface DateRangeFilter {
  from: Date;
  to: Date;
}

export type QuickFilterType = 'today' | 'week' | 'month' | 'quarter' | 'half-year' | 'year' | 'max';
