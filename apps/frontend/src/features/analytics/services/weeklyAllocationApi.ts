import { http } from "@/lib/http";

export interface PlannedFollowUp {
  id: number;
  title: string;
  opportunityId: number | null;
  opportunityTitle: string | null;
  clientName: string;
  channel: string | null;
  dueAt: string;
  effortMinutes: number;
}

export interface WeeklyCandidate extends Omit<PlannedFollowUp, "opportunityId" | "opportunityTitle"> {
  opportunityId: number;
  probability: number;
  valueUsd: string;
  expectedValueUsd: string;
  attention: "OVERDUE" | null;
}

export interface WeeklyPlan {
  weekStart: string;
  generatedAt: string;
  availableMinutes: number | null;
  completedMinutes: number;
  pendingMinutes: number;
  remainingMinutes: number | null;
  overbooked: boolean;
  completed: PlannedFollowUp[];
  otherPending: PlannedFollowUp[];
  withoutFollowUps: { id: number; title: string }[];
  excluded: { id: number; title: string; reason: string }[];
  candidates: WeeklyCandidate[];
  recommended: WeeklyCandidate[];
  allocatedMinutes: number;
  unusedMinutes: number | null;
  selectedExpectedValueUsd: string;
  comparisons: {
    method: "KNAPSACK" | "PROBABILITY" | "VALUE" | "WEIGHTED_VALUE";
    ids: number[];
    allocatedMinutes: number;
    expectedValueUsd: string;
    utilizationPercent: number;
    count: number;
    improvementPercent: number | null;
  }[];
  status: "CAPACITY_REQUIRED" | "OVERBOOKED" | "READY";
}

export const weeklyAllocationApi = {
  preview: async (weekStart: string, ownerId?: number) =>
    (await http.get<WeeklyPlan>(`/api/weekly-allocation/${weekStart}`, { params: { ownerId } })).data,
  saveCapacity: async (weekStart: string, availableMinutes: number, ownerId?: number) =>
    (await http.put(`/api/weekly-allocation/${weekStart}/capacity`, { availableMinutes }, { params: { ownerId } })).data,
};
