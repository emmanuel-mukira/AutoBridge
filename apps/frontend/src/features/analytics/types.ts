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
  stage?: Exclude<OpportunityStage, "CLOSED">;
  startDate?: string;
  endDate?: string;
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
  scope: {
    ownerId: number | null;
    isAdmin: boolean;
    startDate: string | null;
    endDate: string | null;
    dateSemantics: string;
  };
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
    opportunities: {
      id: number;
      title: string;
      outcome: "WON" | "LOST";
      outcomeAt: string;
      client: { id: number; businessName: string };
      owner: { id: number; firstName: string; lastName: string };
      productGroup: { id: number; name: string } | null;
      wonProbability: number;
      modelVariant: "PRIMARY" | "LIMITED_HISTORY";
      predictedAt: string;
    }[];
    ready: boolean;
    message: string;
  };
  opportunities: DecisionSupportOpportunity[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  currencyBasis: { reportingCurrency: "USD"; kesPerUsd: string; source: string; observedAt: string };
}
export interface ReliabilitySummary {
  count: number;
  won: number;
  lost: number;
  meanPrediction: number | null;
  observedWinRate: number | null;
}

export interface ModelPerformance {
  researchEvaluation: ResearchEvaluation;
  modelVersion: string;
  modelName: string;
  evaluation: {
    source: string;
    limitation: string;
    metrics: { key: string; label: string; value: number; explanation: string }[];
  };
  reliability: ModelReliability;
  demonstrationReliability: ModelReliability;
}

export interface ModelReliability {
  eligible: number;
  bins: (ReliabilitySummary & { label: string })[];
  atLeast70: ReliabilitySummary;
  source: string;
  explanation: string;
  warning: string;
}

export interface ResearchEvaluation {
  schemaVersion: 1;
  version: string;
  modelVersion: string;
  predictive: {
    testCount: number;
    bootstrapReplicates: number;
    shapSample: number;
    shapBackground: number;
    models: {
      name: string;
      inputs: number;
      artifactSha256: string;
      metrics: { label: string; value: number; lower: number; upper: number }[];
      reliability: {
        label: string;
        count: number;
        meanPrediction: number | null;
        observedWinRate: number | null;
      }[];
      shap: { attribute: string; percentagePoints: number; share: number }[];
    }[];
    algorithms: {
      name: string;
      rocAuc: number;
      averagePrecision: number;
      brier: number;
    }[];
  };
  optimization: {
    scenarios: number;
    feasibleOutputs: number;
    feasibilityViolations: number;
    optimality: { tested: number; passed: number; failed: number };
    deterministicTests: { passed: number; failed: number; skipped: number };
    definedPercentageCases: number;
    zeroDenominatorCases: number;
    baselines: {
      method: "PROBABILITY" | "VALUE" | "WEIGHTED_VALUE" | "VALUE_PER_HOUR";
      medianImprovementPercent: number;
      strictWins: number;
      ties: number;
      meanGapUsd: number;
      worstGapUsd: number;
    }[];
    runtime: {
      candidateCount: number;
      groupCount: number;
      capacityMinutes: number;
      repetitions: number;
      warmups: number;
      medianMs: number;
      p95Ms: number;
    }[];
    runtimeCpu: string;
    runtimeNode: string;
  };
  sourceSha256: Record<string, string>;
}
