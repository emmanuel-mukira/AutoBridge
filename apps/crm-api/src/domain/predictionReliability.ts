type OutcomeRecord = {
  outcome: "WON" | "LOST" | null;
  outcomeAt: Date | null;
  predictions: {
    id: number;
    predictedAt: Date;
    modelVersion: string;
    modelVariant: string;
    wonProbability: { toString(): string };
  }[];
};

export function predictionReliability(
  records: OutcomeRecord[],
  modelVersion: string,
) {
  const selected: { probability: number; won: boolean }[] = [];
  for (const record of records) {
    if (!record.outcome || !record.outcomeAt) continue;
    // Select before filtering model version so older predictions cannot replace a newer model.
    const prediction = record.predictions
      .filter((item) => item.predictedAt <= record.outcomeAt!)
      .sort(
        (a, b) =>
          b.predictedAt.getTime() - a.predictedAt.getTime() || b.id - a.id,
      )[0];
    if (
      !prediction ||
      prediction.modelVersion !== modelVersion ||
      !["PRIMARY", "LIMITED_HISTORY"].includes(prediction.modelVariant)
    )
      continue;
    const probability = Number(prediction.wonProbability.toString());
    if (!Number.isFinite(probability) || probability < 0 || probability > 1)
      continue;
    selected.push({ probability, won: record.outcome === "WON" });
  }
  return probabilityBandReliability(selected);
}

export function probabilityBandReliability(
  selected: { probability: number; won: boolean }[],
) {
  const summarize = (items: typeof selected) => ({
    count: items.length,
    won: items.filter((item) => item.won).length,
    lost: items.filter((item) => !item.won).length,
    meanPrediction: items.length
      ? items.reduce((sum, item) => sum + item.probability, 0) / items.length
      : null,
    observedWinRate: items.length
      ? items.filter((item) => item.won).length / items.length
      : null,
  });
  return {
    eligible: selected.length,
    bins: Array.from({ length: 10 }, (_, index) => ({
      label: `${index * 10}–${(index + 1) * 10}%`,
      ...summarize(
        selected.filter(
          (item) => Math.min(9, Math.floor(item.probability * 10)) === index,
        ),
      ),
    })),
    atLeast70: summarize(selected.filter((item) => item.probability >= 0.7)),
  };
}
