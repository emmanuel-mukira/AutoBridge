import { z } from "zod";
import { MODEL_VERSION } from "./opportunityScoringInputs.js";

const count = z.number().int().nonnegative();
const positive = z.number().finite().nonnegative();
const probability = positive.max(1);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const metric = z
  .object({
    label: z.enum(["ROC-AUC", "Average Precision", "Brier Score"]),
    value: probability,
    lower: probability,
    upper: probability,
  })
  .strict()
  .refine(
    (row) => row.lower <= row.value && row.value <= row.upper,
    "Invalid confidence interval",
  );
const bin = z
  .object({
    label: z.string(),
    count,
    meanPrediction: probability.nullable(),
    observedWinRate: probability.nullable(),
  })
  .strict()
  .refine(
    (row) =>
      row.count === 0
        ? row.meanPrediction === null && row.observedWinRate === null
        : row.meanPrediction !== null && row.observedWinRate !== null,
    "Invalid bin support",
  );
const model = z
  .object({
    name: z.enum(["Primary RF", "Fallback RF"]),
    inputs: z.union([z.literal(4), z.literal(5)]),
    artifactSha256: hash,
    metrics: z.array(metric).length(3),
    reliability: z.array(bin).length(10),
    shap: z
      .array(
        z
          .object({
            attribute: z.string(),
            percentagePoints: positive,
            share: probability,
          })
          .strict(),
      )
      .min(4)
      .max(5),
  })
  .strict();
export const researchEvaluationSchema = z
  .object({
    schemaVersion: z.literal(1),
    version: z.literal("2026-11-25.v1"),
    modelVersion: z.literal(MODEL_VERSION),
    predictive: z
      .object({
        testCount: z.literal(15030),
        bootstrapReplicates: z.literal(2000),
        shapSample: z.literal(500),
        shapBackground: z.literal(100),
        models: z.array(model).length(2),
        algorithms: z
          .array(
            z
              .object({
                name: z.enum(["Primary RF", "Logistic Regression", "XGBoost"]),
                rocAuc: probability,
                averagePrecision: probability,
                brier: probability,
              })
              .strict(),
          )
          .length(3),
      })
      .strict(),
    optimization: z
      .object({
        scenarios: z.literal(500),
        feasibleOutputs: z.literal(2500),
        feasibilityViolations: z.literal(0),
        optimality: z
          .object({
            tested: z.literal(250),
            passed: z.literal(250),
            failed: z.literal(0),
          })
          .strict(),
        deterministicTests: z
          .object({
            passed: z.literal(16),
            failed: z.literal(0),
            skipped: z.literal(0),
          })
          .strict(),
        definedPercentageCases: z.literal(483),
        zeroDenominatorCases: z.literal(17),
        baselines: z
          .array(
            z
              .object({
                method: z.enum([
                  "PROBABILITY",
                  "VALUE",
                  "WEIGHTED_VALUE",
                  "VALUE_PER_HOUR",
                ]),
                medianImprovementPercent: positive,
                strictWins: count,
                ties: count,
                meanGapUsd: positive,
                worstGapUsd: positive,
              })
              .strict(),
          )
          .length(4),
        runtime: z
          .array(
            z
              .object({
                candidateCount: count,
                groupCount: count,
                capacityMinutes: count,
                repetitions: z.literal(30),
                warmups: z.literal(5),
                medianMs: positive,
                p95Ms: positive,
              })
              .strict(),
          )
          .length(15),
        runtimeCpu: z.string(),
        runtimeNode: z.string(),
      })
      .strict(),
    sourceSha256: z.record(z.string(), hash),
  })
  .strict()
  .superRefine((data, context) => {
    const p = data.predictive;
    const o = data.optimization;
    if (
      new Set(p.models.map((row) => row.name)).size !== 2 ||
      new Set(p.algorithms.map((row) => row.name)).size !== 3 ||
      new Set(o.baselines.map((row) => row.method)).size !== 4 ||
      new Set(
        o.runtime.map((row) => `${row.candidateCount}/${row.capacityMinutes}`),
      ).size !== 15 ||
      p.models.some(
        (row) =>
          row.inputs !== (row.name === "Primary RF" ? 5 : 4) ||
          row.shap.length !== row.inputs ||
          new Set(row.metrics.map((m) => m.label)).size !== 3 ||
          row.reliability.reduce((sum, bin) => sum + bin.count, 0) !==
            p.testCount ||
          Math.abs(row.shap.reduce((sum, field) => sum + field.share, 0) - 1) >
            1e-10,
      ) ||
      o.baselines.some(
        (row) =>
          row.strictWins + row.ties !== o.scenarios ||
          row.meanGapUsd > row.worstGapUsd,
      ) ||
      o.runtime.some(
        (row) =>
          row.medianMs > row.p95Ms || row.groupCount > row.candidateCount,
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "Inconsistent research evaluation aggregates",
      });
    }
  });

export async function getResearchEvaluation() {
  // A literal JSON import makes tsc include this sanitized file in dist/data.
  const { default: summary } = await import(
    "../../data/research-evaluation-summary.json",
    { with: { type: "json" } }
  );
  return researchEvaluationSchema.parse(summary);
}
