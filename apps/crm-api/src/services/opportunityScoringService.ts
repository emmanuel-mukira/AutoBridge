import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../client.js";
import type { ClientActor } from "./clientService.js";
import { ClientSalesHistoryService } from "./clientSalesHistoryService.js";
import type { CreatePredictionReviewInput } from "../schemas/opportunity.schemas.js";
import {
  ADAPTER_VERSION,
  buildCurrentScoringInput,
  MODEL_VERSION,
  predictionMatchesCurrentInput,
} from "./opportunityScoringInputs.js";

export { scoringRouteLabels } from "./opportunityScoringInputs.js";

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
  private inFlight = new Map<string, Promise<unknown>>();

  private async prepare(actor: ClientActor, id: number, asOf: Date, allowResolved = false) {
    const opportunity = await prisma.opportunity.findFirst({
      where: { ...access(actor), id },
      include: { client: true, productSubgroup: { include: { productGroup: true } } },
    });
    if (!opportunity) return null;
    if (opportunity.outcome && !allowResolved) throw new Error("OPPORTUNITY_RESOLVED");
    if (!opportunity.routeToMarket) throw new Error("MISSING_ROUTE");
    if (!opportunity.productSubgroup) throw new Error("MISSING_PRODUCT");

    const evidence = (await this.salesHistory.evidenceForClients(actor, [opportunity.clientId], asOf)).get(opportunity.clientId);
    if (!evidence) return null;
    if (evidence.reviewReason) throw new Error("REVENUE_REVIEW_REQUIRED");
    if (evidence.state !== "UNKNOWN" && evidence.ibmRevenueCode === null) throw new Error("REVENUE_REVIEW_REQUIRED");
    const current = buildCurrentScoringInput(
      opportunity as typeof opportunity & {
        routeToMarket: NonNullable<typeof opportunity.routeToMarket>;
        productSubgroup: NonNullable<typeof opportunity.productSubgroup>;
      },
      evidence,
      asOf,
    );
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
        state: evidence.state, amountUsd: evidence.amountUsd,
        ibmRevenueCode: evidence.ibmRevenueCode,
        windowStart: evidence.windowStart.toISOString(), windowEnd: evidence.windowEnd.toISOString(),
        coverageId: evidence.coverage?.id ?? null,
      },
      scoringIdentity: current.identity,
      modelReadyFeatures: current.features,
    };
    return { opportunity, evidence, ...current, inputSnapshot };
  }

  async score(actor: ClientActor, id: number) {
    const key = `${actor.id}:${id}`;
    const running = this.inFlight.get(key);
    if (running) return running as ReturnType<OpportunityScoringService["scoreOnce"]>;
    const promise = this.scoreOnce(actor, id).finally(() => this.inFlight.delete(key));
    this.inFlight.set(key, promise);
    return promise;
  }

  private async scoreOnce(actor: ClientActor, id: number) {
    const asOf = new Date();
    const prepared = await this.prepare(actor, id, asOf);
    if (!prepared) return null;
    const latest = await prisma.opportunityPrediction.findFirst({
      where: { opportunityId: id },
      include: { reviews: { include: reviewInclude, orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
      orderBy: [{ predictedAt: "desc" }, { id: "desc" }],
    });
    if (latest && predictionMatchesCurrentInput(latest, prepared)) {
      return { ...latest, reused: true, message: "The current win probability is already up to date." };
    }
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

    const currentAfterInference = await this.prepare(actor, id, new Date());
    if (!currentAfterInference || !predictionMatchesCurrentInput({
      modelVersion: MODEL_VERSION,
      adapterVersion: ADAPTER_VERSION,
      modelVariant: prepared.variant,
      inputSnapshot: prepared.inputSnapshot,
    }, currentAfterInference)) throw new Error("SCORING_INPUTS_CHANGED");

    const prediction = await prisma.$transaction(async (tx) => {
      let revenueSummaryId = prepared.evidence.coverage?.id ?? null;
      if (prepared.variant === "PRIMARY" && revenueSummaryId === null) {
        if (prepared.evidence.state !== "VERIFIED_COMPLETE" || prepared.evidence.amountUsd === null) {
          throw new Error("REVENUE_REVIEW_REQUIRED");
        }
        const summary = await tx.clientRevenueSummary.create({
          data: {
            clientId: prepared.opportunity.clientId,
            amount: new Prisma.Decimal(prepared.evidence.amountUsd).toDecimalPlaces(2),
            currency: "USD",
            coverageStart: prepared.evidence.windowStart,
            coverageEnd: prepared.evidence.windowEnd,
            evidenceSource: "Automatically calculated from confirmed Won opportunities",
            declaration: "YES",
            complete: true,
            verifiedAt: asOf,
            verifiedById: actor.id,
          },
        });
        revenueSummaryId = summary.id;
      }
      const inputSnapshot = {
        ...prepared.inputSnapshot,
        revenueEvidence: { ...prepared.inputSnapshot.revenueEvidence, coverageId: revenueSummaryId },
      };
      return tx.opportunityPrediction.create({
        data: {
          opportunityId: id,
          revenueSummaryId,
          modelVersion: MODEL_VERSION,
          adapterVersion: ADAPTER_VERSION,
          modelVariant: prepared.variant,
          inputSnapshot,
          conversionSnapshot: prepared.conversion,
          wonProbability: new Prisma.Decimal(parsed.data.won_probability),
          explanation: parsed.data.explanation,
        },
      });
    });
    return { ...prediction, reviews: [], reused: false, message: "Win probability generated." };
  }

  async history(actor: ClientActor, id: number) {
    const opportunity = await prisma.opportunity.findFirst({
      where: { ...access(actor), id },
      select: { id: true, outcome: true, outcomeAt: true },
    });
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
        const current = await this.prepare(
          actor,
          id,
          opportunity.outcomeAt ?? new Date(),
          Boolean(opportunity.outcome),
        );
        stale = !current || !predictionMatchesCurrentInput(predictions[0], current);
        if (stale) staleReason = opportunity.outcome
          ? "Scoring inputs changed before the outcome was recorded"
          : "Scoring inputs or eligible revenue evidence changed";
      } catch {
        stale = true;
        staleReason = opportunity.outcome
          ? "The saved prediction cannot be matched to the inputs at outcome"
          : "The opportunity is no longer ready for scoring";
      }
    }
    const rows = predictions.map((prediction) => ({ ...prediction, wonProbability: prediction.wonProbability.toString() }));
    return {
      latest: rows[0] ? { ...rows[0], stale, staleReason, outcomeSnapshot: Boolean(opportunity.outcome) } : null,
      history: rows,
    };
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
