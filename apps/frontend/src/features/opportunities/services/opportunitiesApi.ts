import { http } from "@/lib/http";

export type OpportunityStage =
  | "NEW"
  | "QUALIFYING"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "CLOSED";
export type SalesRoute =
  | "FIELDS_SALES"
  | "OTHER"
  | "RESELLER"
  | "TELECOVERAGE"
  | "TELESALES";
export type Currency = "KES" | "USD";
export type OpportunityOutcome = "WON" | "LOST";

export interface Opportunity {
  id: number;
  clientId: number;
  ownerId: number;
  productSubgroupId: number | null;
  title: string;
  estimatedAmount: string;
  currency: Currency;
  routeToMarket: SalesRoute | null;
  stage: OpportunityStage;
  outcome: OpportunityOutcome | null;
  outcomeAt: string | null;
  confirmedAmount: string | null;
  confirmedCurrency: Currency | null;
  confirmedAmountUsd: string | null;
  confirmedQuoteUnitsPerUsd: string | null;
  confirmedRateSource: string | null;
  confirmedRateObservedAt: string | null;
  confirmedAt: string | null;
  estimatedCloseAt: string | null;
  estimatedAt: string;
  createdAt: string;
  updatedAt: string;
  client: { id: number; businessName: string };
  owner: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: "ADMIN" | "SALES_REP";
  };
  productSubgroup: {
    id: number;
    name: string;
    productGroup: { id: number; name: string };
  } | null;
  latestPrediction?: OpportunityPredictionSummary | null;
}

export interface OpportunityPredictionSummary {
  wonProbability: string;
  modelVariant: "PRIMARY" | "LIMITED_HISTORY";
  predictedAt: string;
  stale: boolean;
}

export interface CreateOpportunityInput {
  clientId: number;
  ownerId?: number;
  contactId?: number | null;
  productSubgroupId: number;
  title: string;
  routeToMarket?: SalesRoute | null;
  estimatedCloseAt?: string | null;
  items: { productId: number; quantity: string }[];
}

export interface UpdateOpportunityInput {
  clientId?: number;
  ownerId?: number;
  productSubgroupId?: number;
  title?: string;
  routeToMarket?: SalesRoute | null;
  estimatedCloseAt?: string | null;
}

export interface OpportunityFilters {
  search?: string;
  stage?: OpportunityStage;
  clientId?: number;
  ownerId?: number;
  productGroupId?: number;
  productSubgroupId?: number;
  routeToMarket?: SalesRoute;
  limit?: number;
}

export interface ConfirmedSaleInput {
  confirmedAmount: string;
  confirmedCurrency: Currency;
}

export interface ProductGroup {
  id: number;
  name: string;
  subgroups: { id: number; name: string; productGroupId: number }[];
}

export interface OpportunityOwner {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: "ADMIN" | "SALES_REP";
}

export interface PredictionContribution {
  feature: string;
  display_name: string;
  feature_value: string | number;
  feature_unit: string;
  contribution: number;
}

export type PredictionExplanation =
  | {
      status: "available";
      output: "won_probability";
      units: "probability";
      baseline: number;
      predicted_value: number;
      reconstructed_value: number;
      additivity_error: number;
      contributions: PredictionContribution[];
      top_factors?: PredictionContribution[];
      top_positive: PredictionContribution[];
      top_negative: PredictionContribution[];
      explainer: {
        library: "shap";
        version: string;
        algorithm: "TreeExplainer";
        feature_perturbation: string;
        model_output: string;
        class_index: 1;
        class_label: "Won";
      };
    }
  | { status: "unavailable"; reason: string };

export type PredictionAssessment =
  | "REASONABLE"
  | "OVERESTIMATED"
  | "UNDERESTIMATED";

export interface PredictionReview {
  id: number;
  predictionId: number;
  reviewerId: number;
  assessment: PredictionAssessment;
  comment: string | null;
  createdAt: string;
  reviewer: OpportunityOwner;
}

export interface OpportunityPrediction {
  id: number;
  opportunityId: number;
  modelVersion: string;
  adapterVersion: string;
  modelVariant: "PRIMARY" | "LIMITED_HISTORY";
  wonProbability: string;
  predictedAt: string;
  inputSnapshot: Record<string, unknown>;
  conversionSnapshot: Record<string, unknown>;
  explanation: PredictionExplanation | null;
  reviews: PredictionReview[];
  reused?: boolean;
  message?: string;
}

export interface PredictionHistory {
  latest:
    | (OpportunityPrediction & { stale: boolean; staleReason: string | null; outcomeSnapshot: boolean })
    | null;
  history: OpportunityPrediction[];
}

export const opportunitiesApi = {
  list: async (filters: OpportunityFilters = {}) =>
    (
      await http.get<{
        opportunities: Opportunity[];
        pagination: { total: number };
      }>("/api/opportunities", { params: filters })
    ).data,
  getById: async (id: number) =>
    (await http.get<Opportunity>(`/api/opportunities/${id}`)).data,
  create: async (input: CreateOpportunityInput) =>
    (await http.post<Opportunity>("/api/opportunities", input)).data,
  update: async (id: number, input: UpdateOpportunityInput) =>
    (await http.patch<Opportunity>(`/api/opportunities/${id}`, input)).data,
  transition: async (
    id: number,
    stage: OpportunityStage,
    outcome?: OpportunityOutcome,
    confirmedSale?: ConfirmedSaleInput,
  ) =>
    (
      await http.patch<Opportunity>(`/api/opportunities/${id}/stage`, {
        stage,
        ...(outcome ? { outcome } : {}),
        ...confirmedSale,
      })
    ).data,
  correctConfirmedSale: async (id: number, input: ConfirmedSaleInput) =>
    (
      await http.patch<Opportunity>(
        `/api/opportunities/${id}/confirmed-sale`,
        input,
      )
    ).data,
  score: async (id: number) =>
    (await http.post<OpportunityPrediction>(`/api/opportunities/${id}/score`))
      .data,
  predictions: async (id: number) =>
    (await http.get<PredictionHistory>(`/api/opportunities/${id}/predictions`))
      .data,
  reviewPrediction: async (
    opportunityId: number,
    predictionId: number,
    input: { assessment: PredictionAssessment; comment?: string },
  ) =>
    (
      await http.post<PredictionReview>(
        `/api/opportunities/${opportunityId}/predictions/${predictionId}/reviews`,
        input,
      )
    ).data,
  products: async () =>
    (
      await http.get<{ productGroups: ProductGroup[] }>(
        "/api/opportunities/products",
      )
    ).data.productGroups,
  owners: async () =>
    (
      await http.get<{ owners: OpportunityOwner[] }>(
        "/api/opportunities/owners",
      )
    ).data.owners,
};
