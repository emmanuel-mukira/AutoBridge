import { Prisma, type PredictionModelVariant, type SalesRoute } from "@prisma/client";
import { convertMoneyToUsd, ILLUSTRATIVE_USD_KES_RATE } from "../domain/currency.js";

export const MODEL_VERSION = "automotive_v1";
export const ADAPTER_VERSION = "autobridge_automotive_v1";

export const scoringRouteLabels = {
  FIELDS_SALES: "Fields Sales",
  OTHER: "Other",
  RESELLER: "Reseller",
  TELECOVERAGE: "Telecoverage",
  TELESALES: "Telesales",
} as const;

export type ScoringRevenueEvidence = {
  state: "UNKNOWN" | "VERIFIED_ZERO" | "VERIFIED_COMPLETE";
  ibmRevenueCode: 0 | 1 | 2 | 3 | 4 | null;
  reviewReason: string | null;
};

type ScoringOpportunity = {
  estimatedAmount: Prisma.Decimal;
  currency: string;
  routeToMarket: SalesRoute;
  productSubgroup: { name: string; productGroup: { name: string } };
};

export type CurrentScoringInput = {
  variant: PredictionModelVariant;
  features: Record<string, string | number>;
  identity: {
    modelVersion: string;
    adapterVersion: string;
    modelVariant: PredictionModelVariant;
    opportunityAmountUsd: string;
    routeToMarket: string;
    productGroup: string;
    productSubgroup: string;
    revenueCode: number | null;
  };
  conversion: ReturnType<typeof convertMoneyToUsd>;
};

export function buildCurrentScoringInput(
  opportunity: ScoringOpportunity,
  evidence: ScoringRevenueEvidence,
  asOf: Date,
): CurrentScoringInput {
  const primary = evidence.state !== "UNKNOWN";
  const variant: PredictionModelVariant = primary ? "PRIMARY" : "LIMITED_HISTORY";
  const conversion = convertMoneyToUsd({
    amount: opportunity.estimatedAmount,
    currency: opportunity.currency,
    ...(opportunity.currency === "KES" ? { rate: ILLUSTRATIVE_USD_KES_RATE } : {}),
    convertedAt: asOf,
  });
  const opportunityAmountUsd = new Prisma.Decimal(conversion.modelReadyAmountUsd)
    .toDecimalPlaces(6)
    .toFixed(6);
  const routeToMarket = scoringRouteLabels[opportunity.routeToMarket];
  const productGroup = opportunity.productSubgroup.productGroup.name;
  const productSubgroup = opportunity.productSubgroup.name;
  const revenueCode = primary ? evidence.ibmRevenueCode : null;
  const features: Record<string, string | number> = {
    "Opportunity Amount USD": Number(opportunityAmountUsd),
    ...(primary ? { "Revenue From Client Past Two Years": revenueCode! } : {}),
    "Route To Market": routeToMarket,
    "Supplies Group": productGroup,
    "Supplies Subgroup": productSubgroup,
  };
  return {
    variant,
    features,
    identity: {
      modelVersion: MODEL_VERSION,
      adapterVersion: ADAPTER_VERSION,
      modelVariant: variant,
      opportunityAmountUsd,
      routeToMarket,
      productGroup,
      productSubgroup,
      revenueCode,
    },
    conversion,
  };
}

function savedFeatures(value: Prisma.JsonValue) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const features = (value as Prisma.JsonObject).modelReadyFeatures;
  return features && typeof features === "object" && !Array.isArray(features)
    ? features as Prisma.JsonObject
    : null;
}

export function predictionMatchesCurrentInput(
  prediction: {
    modelVersion: string;
    adapterVersion: string;
    modelVariant: PredictionModelVariant;
    inputSnapshot: Prisma.JsonValue;
  },
  current: CurrentScoringInput,
) {
  if (
    prediction.modelVersion !== current.identity.modelVersion
    || prediction.adapterVersion !== current.identity.adapterVersion
    || prediction.modelVariant !== current.identity.modelVariant
  ) return false;
  const saved = savedFeatures(prediction.inputSnapshot);
  if (!saved) return false;
  try {
    const savedAmount = new Prisma.Decimal(String(saved["Opportunity Amount USD"]))
      .toDecimalPlaces(6)
      .toFixed(6);
    const savedRevenue = saved["Revenue From Client Past Two Years"];
    return savedAmount === current.identity.opportunityAmountUsd
      && saved["Route To Market"] === current.identity.routeToMarket
      && saved["Supplies Group"] === current.identity.productGroup
      && saved["Supplies Subgroup"] === current.identity.productSubgroup
      && (current.variant === "PRIMARY"
        ? Number(savedRevenue) === current.identity.revenueCode
        : savedRevenue === undefined);
  } catch {
    return false;
  }
}
