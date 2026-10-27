import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../client.js";
import { convertMoneyToUsd, ILLUSTRATIVE_USD_KES_RATE } from "../domain/currency.js";
import type { ClientActor } from "./clientService.js";
import { ClientSalesHistoryService } from "./clientSalesHistoryService.js";
import type { CreatePredictionReviewInput } from "../schemas/opportunity.schemas.js";

const MODEL_VERSION = "automotive_v1";
const ADAPTER_VERSION = "autobridge_automotive_v1";
const routeLabels = {
  FIELDS_SALES: "Fields Sales",
  OTHER: "Other",
  RESELLER: "Reseller",
  TELECOVERAGE: "Telecoverage",
  TELESALES: "Telesales",
} as const;

const ContributionSchema = z.object({
  feature: z.string(), display_name: z.string(), feature_value: z.union([z.string(), z.number()]),
  feature_unit: z.string(), contribution: z.number(),
});
const ExplanationSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("available"), output: z.literal("won_probability"), units: z.literal("probability"),
    baseline: z.number(), predicted_value: z.number().min(0).max(1), reconstructed_value: z.number(), additivity_error: z.number().nonnegative(),
    contributions: z.array(ContributionSchema), top_factors: z.array(ContributionSchema).length(3),
    top_positive: z.array(ContributionSchema), top_negative: z.array(ContributionSchema),
    explainer: z.object({
      library: z.literal("shap"), version: z.string(), algorithm: z.literal("TreeExplainer"),
      feature_perturbation: z.literal("tree_path_dependent"), model_output: z.string(),
      class_index: z.literal(1), class_label: z.literal("Won"),
    }),
  }),
  z.object({ status: z.literal("unavailable"), reason: z.string() }),
]);

const MlResponseSchema = z.object({
  api_version: z.literal("v1"),
  model_family: z.literal("Random Forest"),
  model_version: z.literal(MODEL_VERSION),
  variant: z.enum(["PRIMARY", "LIMITED_HISTORY"]),
  won_probability: z.number().min(0).max(1),
  features: z.record(z.unknown()),
  explanation: ExplanationSchema,
});

const reviewInclude = {
  reviewer: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
} as const;

function access(actor: ClientActor): Prisma.OpportunityWhereInput {
  return actor.role === "ADMIN" ? {} : { ownerId: actor.id, client: { ownerId: actor.id, deletedAt: null } };
}

function mlConfig() {
  const baseUrl = process.env.ML_API_URL?.replace(/\/$/, "");
  const token = process.env.ML_API_TOKEN;
  const timeoutMs = Number(process.env.ML_API_TIMEOUT_MS ?? 5000);
  if (!baseUrl || !token || !Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30_000) throw new Error("ML_NOT_CONFIGURED");
  return { baseUrl, token, timeoutMs };
}

export class OpportunityScoringService {
  private salesHistory = new ClientSalesHistoryService();

  private async prepare(actor: ClientActor, id: number, asOf: Date) {
    const opportunity = await prisma.opportunity.findFirst({
      where: { ...access(actor), id },
      include: { client: true, productSubgroup: { include: { productGroup: true } } },
    });
    if (!opportunity) return null;
    if (opportunity.outcome) throw new Error("OPPORTUNITY_RESOLVED");
    if (!opportunity.routeToMarket) throw new Error("MISSING_ROUTE");
    if (!opportunity.productSubgroup) throw new Error("MISSING_PRODUCT");

    const conversion = convertMoneyToUsd({
      amount: opportunity.estimatedAmount,
      currency: opportunity.currency,
      ...(opportunity.currency === "KES" ? { rate: ILLUSTRATIVE_USD_KES_RATE } : {}),
      convertedAt: asOf,
    });
    const history = await this.salesHistory.get(actor, opportunity.clientId, asOf.toISOString());
    if (!history) return null;
    if (history.revenueEvidence.reviewReason) throw new Error("REVENUE_REVIEW_REQUIRED");

    const primary = history.revenueEvidence.state !== "UNKNOWN";
    if (primary && history.revenueEvidence.ibmRevenueCode === null) throw new Error("REVENUE_REVIEW_REQUIRED");
    const variant = primary ? "PRIMARY" : "LIMITED_HISTORY";
    const features: Record<string, string | number> = {
      "Opportunity Amount USD": Number(conversion.modelReadyAmountUsd),
      ...(primary ? { "Revenue From Client Past Two Years": history.revenueEvidence.ibmRevenueCode! } : {}),
      "Route To Market": routeLabels[opportunity.routeToMarket],
      "Supplies Group": opportunity.productSubgroup.productGroup.name,
      "Supplies Subgroup": opportunity.productSubgroup.name,
    };
    const inputSnapshot = {
      contractVersion: ADAPTER_VERSION,
      requestedById: actor.id,
      clientId: opportunity.clientId,
      scoringTimestamp: asOf.toISOString(),
      opportunity: {
        estimatedAmount: opportunity.estimatedAmount.toString(), currency: opportunity.currency,
        estimatedAt: opportunity.estimatedAt.toISOString(), routeToMarket: opportunity.routeToMarket,
        productSubgroupId: opportunity.productSubgroupId, productGroup: opportunity.productSubgroup.productGroup.name,
        productSubgroup: opportunity.productSubgroup.name,
      },
      revenueEvidence: {
        state: history.revenueEvidence.state, amountUsd: history.revenueEvidence.amountUsd,
        ibmRevenueCode: history.revenueEvidence.ibmRevenueCode,
        windowStart: history.revenueEvidence.windowStart, windowEnd: history.revenueEvidence.windowEnd,
        coverageId: history.revenueEvidence.coverage?.id ?? null,
      },
      modelReadyFeatures: features,
    };
    return { opportunity, history, conversion, variant, features, inputSnapshot };
  }

  async score(actor: ClientActor, id: number) {
    const asOf = new Date();
    const prepared = await this.prepare(actor, id, asOf);
    if (!prepared) return null;
    const config = mlConfig();
    let response: Response;
    try {
      response = await fetch(`${config.baseUrl}/predict`, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ api_version: "v1", model_version: MODEL_VERSION, variant: prepared.variant, features: prepared.features }),
        signal: AbortSignal.timeout(config.timeoutMs),
      });
    } catch {
      throw new Error("ML_UNAVAILABLE");
    }
    if (!response.ok) throw new Error(response.status === 422 ? "ML_REJECTED_INPUT" : "ML_UNAVAILABLE");
    const parsed = MlResponseSchema.safeParse(await response.json());
    if (!parsed.success || parsed.data.variant !== prepared.variant) throw new Error("ML_INVALID_RESPONSE");

    const prediction = await prisma.opportunityPrediction.create({
      data: {
        opportunityId: id,
        revenueSummaryId:
          prepared.variant === "PRIMARY"
            ? (prepared.history.revenueEvidence.coverage?.id ?? null)
            : null,
        modelVersion: MODEL_VERSION,
        adapterVersion: ADAPTER_VERSION,
        modelVariant: prepared.variant,
        inputSnapshot: prepared.inputSnapshot,
        conversionSnapshot: prepared.conversion,
        wonProbability: new Prisma.Decimal(parsed.data.won_probability),
        explanation: parsed.data.explanation,
      },
    });
    return { ...prediction, reviews: [] };
  }

  async history(actor: ClientActor, id: number) {
    const opportunity = await prisma.opportunity.findFirst({ where: { ...access(actor), id }, select: { id: true } });
    if (!opportunity) return null;
    const predictions = await prisma.opportunityPrediction.findMany({
      where: { opportunityId: id },
      include: { reviews: { include: reviewInclude, orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
      orderBy: [{ predictedAt: "desc" }, { id: "desc" }],
    });
    let stale = false;
    let staleReason: string | null = null;
    if (predictions[0]) {
      try {
        const current = await this.prepare(actor, id, new Date());
        const snapshot = predictions[0].inputSnapshot as Prisma.JsonObject;
        const previous = snapshot.modelReadyFeatures as Prisma.JsonObject;
        stale = !current || JSON.stringify(Object.entries(previous).sort()) !== JSON.stringify(Object.entries(current.features).sort());
        if (stale) staleReason = "Scoring inputs or eligible revenue evidence changed";
      } catch {
        stale = true;
        staleReason = "The opportunity is no longer ready for scoring";
      }
    }
    const rows = predictions.map((prediction) => ({ ...prediction, wonProbability: prediction.wonProbability.toString() }));
    return { latest: rows[0] ? { ...rows[0], stale, staleReason } : null, history: rows };
  }

  private async accessiblePrediction(actor: ClientActor, opportunityId: number, predictionId: number) {
    return prisma.opportunityPrediction.findFirst({
      where: { id: predictionId, opportunityId, opportunity: { ...access(actor) } },
      select: { id: true },
    });
  }

  async reviews(actor: ClientActor, opportunityId: number, predictionId: number) {
    if (!await this.accessiblePrediction(actor, opportunityId, predictionId)) return null;
    return prisma.predictionReview.findMany({
      where: { predictionId },
      include: reviewInclude,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
  }

  async review(actor: ClientActor, opportunityId: number, predictionId: number, input: CreatePredictionReviewInput) {
    if (!await this.accessiblePrediction(actor, opportunityId, predictionId)) return null;
    const existing = await prisma.predictionReview.findUnique({
      where: { predictionId_reviewerId: { predictionId, reviewerId: actor.id } },
      select: { id: true },
    });
    if (existing) throw new Error("REVIEW_EXISTS");
    try {
      return await prisma.predictionReview.create({
        data: {
          predictionId,
          reviewerId: actor.id,
          assessment: input.assessment,
          comment: input.comment || null,
        },
        include: reviewInclude,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new Error("REVIEW_EXISTS");
      throw error;
    }
  }
}
