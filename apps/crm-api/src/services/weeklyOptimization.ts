import { Prisma } from "@prisma/client";

export type PlanningCandidate = {
  id: number;
  opportunityId: number;
  title: string;
  clientName: string;
  channel: string | null;
  dueAt: Date;
  probability: number;
  valueUsd: string;
  expectedValueUsd: string;
  attention: "OVERDUE" | null;
  effortMinutes: number;
};

type Selection = {
  ids: number[];
  allocatedMinutes: number;
  expectedValueUsd: string;
  utilizationPercent: number;
  count: number;
};
const zero = new Prisma.Decimal(0);

function validate(candidates: PlanningCandidate[], capacityMinutes: number) {
  if (
    !Number.isInteger(capacityMinutes) ||
    capacityMinutes < 0 ||
    capacityMinutes > 4800 ||
    capacityMinutes % 15 !== 0
  )
    throw new Error("INVALID_CAPACITY");
  if (
    candidates.length > 200 ||
    new Set(candidates.map((item) => item.id)).size !== candidates.length
  )
    throw new Error("INVALID_CANDIDATES");
  for (const item of candidates) {
    if (
      !Number.isInteger(item.id) ||
      item.id <= 0 ||
      !Number.isFinite(item.probability) ||
      item.probability < 0 ||
      item.probability > 1 ||
      !Number.isInteger(item.effortMinutes) ||
      item.effortMinutes <= 0 ||
      item.effortMinutes > 4800 ||
      item.effortMinutes % 15 !== 0
    )
      throw new Error("INVALID_CANDIDATE");
    try {
      if (
        !new Prisma.Decimal(item.valueUsd).isFinite() ||
        new Prisma.Decimal(item.valueUsd).isNegative() ||
        !new Prisma.Decimal(item.expectedValueUsd).isFinite() ||
        new Prisma.Decimal(item.expectedValueUsd).isNegative()
      )
        throw new Error("INVALID_CANDIDATE");
    } catch {
      throw new Error("INVALID_CANDIDATE");
    }
  }
}

function summary(
  ids: number[],
  candidates: PlanningCandidate[],
  capacityMinutes: number,
): Selection {
  const selected = new Set(ids);
  const chosen = candidates.filter((item) => selected.has(item.id));
  const allocatedMinutes = chosen.reduce(
    (sum, item) => sum + item.effortMinutes,
    0,
  );
  return {
    ids: [...ids].sort((a, b) => a - b),
    allocatedMinutes,
    expectedValueUsd: chosen
      .reduce((sum, item) => sum.plus(item.expectedValueUsd), zero)
      .toFixed(2),
    utilizationPercent: capacityMinutes
      ? Number(((allocatedMinutes * 100) / capacityMinutes).toFixed(1))
      : 0,
    count: ids.length,
  };
}

export function optimizeWeekly(
  candidates: PlanningCandidate[],
  capacityMinutes: number,
) {
  validate(candidates, capacityMinutes);
  const ordered = [...candidates].sort((a, b) => a.id - b.id);
  const slots = capacityMinutes / 15;
  const groups = new Map<number, PlanningCandidate[]>();
  for (const item of ordered) groups.set(item.opportunityId, [...(groups.get(item.opportunityId) ?? []), item]);
  type Cell = { value: Prisma.Decimal; used: number; choiceId: number | null };
  const rows: Cell[][] = [
    Array.from({ length: slots + 1 }, () => ({
      value: zero,
      used: 0,
      choiceId: null,
    })),
  ];
  for (const group of groups.values()) {
    const previous = rows[rows.length - 1];
    const next = previous.map((skip, capacity) => {
      let best = { ...skip, choiceId: null as number | null };
      for (const item of group) {
        const cost = item.effortMinutes / 15;
        if (cost > capacity) continue;
        const base = previous[capacity - cost];
        const takenValue = base.value.plus(item.expectedValueUsd);
        const takenMinutes = base.used + item.effortMinutes;
        const comparison = takenValue.comparedTo(best.value);
        if (comparison > 0 || (comparison === 0 && takenMinutes < best.used))
          best = { value: takenValue, used: takenMinutes, choiceId: item.id };
      }
      return best;
    });
    rows.push(next);
  }
  const ids: number[] = [];
  const byId = new Map(ordered.map((item) => [item.id, item]));
  let capacity = slots;
  for (let index = groups.size; index > 0; index -= 1) {
    const choiceId = rows[index][capacity].choiceId;
    if (choiceId !== null) {
      ids.push(choiceId);
      capacity -= byId.get(choiceId)!.effortMinutes / 15;
    }
  }
  const optimal = summary(ids, ordered, capacityMinutes);
  const baselines = (["PROBABILITY", "VALUE", "WEIGHTED_VALUE"] as const).map(
    (method) => {
      const sorted = [...ordered].sort((a, b) => {
        const score =
          method === "PROBABILITY"
            ? b.probability - a.probability
            : new Prisma.Decimal(
                method === "VALUE" ? b.valueUsd : b.expectedValueUsd,
              ).comparedTo(
                method === "VALUE" ? a.valueUsd : a.expectedValueUsd,
              );
        return score || a.id - b.id;
      });
      let remaining = capacityMinutes;
      const greedyIds: number[] = [];
      const selectedOpportunities = new Set<number>();
      for (const item of sorted)
        if (!selectedOpportunities.has(item.opportunityId) && item.effortMinutes <= remaining) {
          greedyIds.push(item.id);
          selectedOpportunities.add(item.opportunityId);
          remaining -= item.effortMinutes;
        }
      const result = summary(greedyIds, ordered, capacityMinutes);
      const baselineValue = new Prisma.Decimal(result.expectedValueUsd);
      return {
        method,
        ...result,
        improvementPercent: baselineValue.isZero()
          ? null
          : Number(
              new Prisma.Decimal(optimal.expectedValueUsd)
                .minus(baselineValue)
                .div(baselineValue)
                .times(100)
                .toFixed(1),
            ),
      };
    },
  );
  return { optimal, baselines };
}
