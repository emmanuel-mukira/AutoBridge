import type { OpportunityStage, SalesRoute } from "../services/opportunitiesApi";

export const opportunityStageLabels: Record<OpportunityStage, string> = {
  NEW: "New",
  QUALIFYING: "Qualifying",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  CLOSED: "Closed",
};

export const salesRouteLabels: Record<SalesRoute, string> = {
  FIELDS_SALES: "Field sales",
  OTHER: "Other",
  RESELLER: "Reseller",
  TELECOVERAGE: "Telecoverage",
  TELESALES: "Telesales",
};

export const opportunityStageClass: Record<OpportunityStage, string> = {
  NEW: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
  QUALIFYING: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300",
  PROPOSAL: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  NEGOTIATION: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  CLOSED: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};
