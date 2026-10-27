import type { Currency, OpportunityStage } from "@/features/opportunities/services/opportunitiesApi";
import type { InteractionType } from "@/features/activities/services/activitiesApi";

export interface DateRangeFilter { from: Date; to: Date }
export type QuickFilterType = "today" | "week" | "month" | "quarter" | "half-year" | "year" | "max";
export interface RegionalDistribution { region: string; count: number }

export interface AnalyticsFilters {
  ownerId?: number;
  stage?: OpportunityStage;
  outcome?: "WON" | "LOST";
  productGroupId?: number;
}

export interface AnalyticsOpportunity {
  id: number;
  title: string;
  estimatedAmount: string;
  currency: Currency;
  stage: OpportunityStage;
  outcome: "WON" | "LOST" | null;
  estimatedCloseAt: string | null;
  createdAt: string;
  client: { id: number; businessName: string };
  owner: { id: number; firstName: string; lastName: string };
}

export interface AnalyticsInteraction {
  id: number;
  interactionType: InteractionType;
  notes: string | null;
  occurredAt: string;
  client: { id: number; businessName: string };
  opportunity: { id: number; title: string } | null;
  user: { id: number; firstName: string; lastName: string };
}

export interface AnalyticsOverview {
  scope: { startDate: string | null; endDate: string | null; ownerId: number | null; isAdmin: boolean };
  summary: {
    totalOpportunities: number;
    openOpportunities: number;
    wonOpportunities: number;
    lostOpportunities: number;
    winRate: number | null;
    openPipelineValueUsd: string;
  };
  distributions: {
    byStage: { key: OpportunityStage; count: number }[];
    byOutcome: { key: "WON" | "LOST" | "OPEN"; count: number }[];
    byOwner: { id: number; label: string; count: number }[];
    byProductGroup: { id: number | null; label: string; count: number }[];
    byRoute: { key: string; count: number }[];
  };
  activities: { interactionsRecorded: number; upcomingFollowUps: number; overdueFollowUps: number; completedFollowUps: number };
  recentOpportunities: AnalyticsOpportunity[];
  attentionOpportunities: AnalyticsOpportunity[];
  recentInteractions: AnalyticsInteraction[];
  currencyBasis: { reportingCurrency: "USD"; kesPerUsd: string; source: string; observedAt: string };
}
