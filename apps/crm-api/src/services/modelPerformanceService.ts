import { getResearchEvaluation } from "./researchEvaluation.js";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { prisma } from "../client.js";
import { predictionReliability } from "../domain/predictionReliability.js";
import { MODEL_VERSION } from "./opportunityScoringInputs.js";

const score = z.number().finite().min(0).max(1);
const metadataSchema = z.object({
  model_version: z.literal(MODEL_VERSION),
  test_metrics: z.object({
    "ROC-AUC": score,
    "Average Precision": score,
    "Brier Score": score,
  }),
});

const summarySchema = z.object({
  modelVersion: z.literal(MODEL_VERSION),
  modelSha256: z.string().regex(/^[a-f0-9]{64}$/),
  datasetSha256: z.string().regex(/^[a-f0-9]{64}$/),
  sourceReplaySha256: z.string().regex(/^[a-f0-9]{64}$/),
  source: z.string(),
  explanation: z.string(),
  warning: z.string(),
  reliability: z.object({
    eligible: z.number().int().positive(),
    bins: z
      .array(
        z.object({
          label: z.string(),
          count: z.number().int().nonnegative(),
          won: z.number().int().nonnegative(),
          lost: z.number().int().nonnegative(),
          meanPrediction: score.nullable(),
          observedWinRate: score.nullable(),
        }),
      )
      .length(10),
    atLeast70: z.object({
      count: z.number().int().nonnegative(),
      won: z.number().int().nonnegative(),
      lost: z.number().int().nonnegative(),
      meanPrediction: score.nullable(),
      observedWinRate: score.nullable(),
    }),
  }),
});

async function readPackagedJson(paths: string[]) {
  // Support source execution and dist/src execution without depending on the working directory.
  for (const relative of paths) {
    try {
      return JSON.parse(
        await readFile(new URL(relative, import.meta.url), "utf8"),
      ) as unknown;
    } catch (error) {
      if (
        !(error instanceof Error && "code" in error && error.code === "ENOENT")
      )
        throw error;
    }
  }
  throw new Error("Model performance data is unavailable");
}

export async function getModelPerformance() {
  const metadata = metadataSchema.parse(
    await readPackagedJson([
      "../../../../models/automotive_v1/metadata.json",
      "../../../../../models/automotive_v1/metadata.json",
    ]),
  );
  const summary = summarySchema.parse(
    await readPackagedJson([
      "../../data/ibm-reliability-summary.json",
      "../../../data/ibm-reliability-summary.json",
    ]),
  );
  if (
    summary.reliability.bins.reduce((total, bin) => total + bin.count, 0) !==
      summary.reliability.eligible ||
    summary.reliability.bins.some((bin) => bin.won + bin.lost !== bin.count) ||
    summary.reliability.atLeast70.won + summary.reliability.atLeast70.lost !==
      summary.reliability.atLeast70.count
  )
    throw new Error("Packaged model performance summary is inconsistent");
  const resolved = await prisma.opportunity.findMany({
    where: {
      client: { deletedAt: null },
      outcome: { in: ["WON", "LOST"] },
      outcomeAt: { not: null },
    },
    select: {
      outcome: true,
      outcomeAt: true,
      predictions: {
        select: {
          id: true,
          predictedAt: true,
          modelVersion: true,
          modelVariant: true,
          wonProbability: true,
        },
      },
    },
  });
  return {
    researchEvaluation: await getResearchEvaluation(),
    modelVersion: metadata.model_version,
    modelName: "Automotive 5 · Random Forest",
    evaluation: {
      source: "Recorded internal IBM test evaluation · primary model",
      limitation:
        "Not independent local-market validation. These frozen metrics do not change with live sales outcomes.",
      metrics: [
        {
          key: "rocAuc",
          label: "ROC-AUC",
          value: metadata.test_metrics["ROC-AUC"],
          explanation:
            "How well wins rank above losses across cut-offs. Higher is better; 0.5 is random ranking.",
        },
        {
          key: "averagePrecision",
          label: "Average Precision",
          value: metadata.test_metrics["Average Precision"],
          explanation:
            "How well the ranked list retrieves wins across cut-offs. Higher is better; this is not classification accuracy.",
        },
        {
          key: "brier",
          label: "Brier Score",
          value: metadata.test_metrics["Brier Score"],
          explanation:
            "How close predicted probabilities are to actual outcomes. Lower is better; 0 is perfect.",
        },
      ],
    },
    demonstrationReliability: {
      ...summary.reliability,
      source: summary.source,
      explanation: summary.explanation,
      warning: summary.warning,
    },
    reliability: {
      ...predictionReliability(resolved, metadata.model_version),
      source: "Recorded application outcomes · all time · both model variants",
      explanation:
        "Each resolved opportunity counts once, using its latest prediction saved at or before the outcome. Open opportunities are excluded.",
      warning:
        "Small samples can vary substantially. Recorded outcomes, including any demonstration records, do not establish independent model validation.",
    },
  };
}
