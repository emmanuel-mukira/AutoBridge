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
  scope: {
    startDate: string | null;
    endDate: string | null;
    ownerId: number | null;
    isAdmin: boolean;
    dateSemantics: { createdOpportunities: "createdAt"; resolvedOutcomes: "outcomeAt"; openPipeline: "current" };
  };
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
    byOwner: { id: number; label: string; count: number; won: number; lost: number; resolved: number; winRate: number | null; confirmedWonValueUsd: string }[];
    byProductGroup: { id: number | null; label: string; won: number; lost: number; resolved: number; winRate: number | null }[];
    byRoute: { key: string; won: number; lost: number; resolved: number; winRate: number | null }[];
  };
  activities: { interactionsRecorded: number; upcomingFollowUps: number; overdueFollowUps: number; completedFollowUps: number };
  recentOpportunities: AnalyticsOpportunity[];
  attentionOpportunities: AnalyticsOpportunity[];
  recentInteractions: AnalyticsInteraction[];
  currencyBasis: { reportingCurrency: "USD"; kesPerUsd: string; source: string; observedAt: string };
}

export type PredictionStatus = "CURRENT" | "STALE" | "UNSCORED";
export type DecisionSupportSort = "WEIGHTED_VALUE" | "PROBABILITY" | "VALUE" | "FOLLOW_UP";

export interface DecisionSupportFilters {
  ownerId?: number;
  productGroupId?: number;
  predictionStatus?: PredictionStatus;
  sort?: DecisionSupportSort;
  page?: number;
  limit?: number;
}

export interface DecisionSupportOpportunity {
  id: number;
  title: string;
  client: { id: number; businessName: string };
  owner: { id: number; firstName: string; lastName: string };
  productGroup: { id: number; name: string } | null;
  estimatedAmount: string;
  currency: Currency;
  estimatedValueUsd: string;
  wonProbability: number | null;
  weightedValueUsd: string | null;
  predictionStatus: PredictionStatus;
  modelVariant: "PRIMARY" | "LIMITED_HISTORY" | null;
  predictedAt: string | null;
  eligible: boolean;
  nextFollowUp: { id: number; title: string; dueAt: string; status: "OVERDUE" | "UPCOMING" } | null;
  followUpStatus: "OVERDUE" | "UPCOMING" | "NONE";
  latestReview: "REASONABLE" | "OVERESTIMATED" | "UNDERESTIMATED" | null;
}

export interface DecisionSupportOverview {
  scope: { ownerId: number | null; isAdmin: boolean };
  summary: {
    openOpportunities: number;
    eligibleOpenOpportunities: number;
    currentPredictions: number;
    scoringCoveragePercent: number | null;
    needsAttention: number;
    stalePredictions: number;
    unscoredOpportunities: number;
    probabilityWeightedPipelineUsd: string;
  };
  charts: {
    probabilityDistribution: { key: string; count: number }[];
    coverage: { current: number; stale: number; unscored: number };
    modelUsage: { primary: number; limitedHistory: number };
  };
  reviews: {
    REASONABLE: number;
    OVERESTIMATED: number;
    UNDERESTIMATED: number;
    unreviewed: number;
    basis: string;
  };
  outcomeMonitoring: {
    resolvedOpportunities: number;
    eligiblePredictions: number;
    byModelVariant: { variant: "PRIMARY" | "LIMITED_HISTORY"; eligible: number; won: number; lost: number }[];
    ready: boolean;
    message: string;
  };
  opportunities: DecisionSupportOpportunity[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  currencyBasis: { reportingCurrency: "USD"; kesPerUsd: string; source: string; observedAt: string };
}
