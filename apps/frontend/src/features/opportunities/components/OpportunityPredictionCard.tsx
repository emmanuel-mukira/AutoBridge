import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useOpportunityPredictions, useScoreOpportunity } from "../hooks/useOpportunities";
import type { Opportunity } from "../services/opportunitiesApi";
import { PredictionExplanation } from "./PredictionExplanation";
import { ChevronDown } from "lucide-react";
import { PredictionReviewSection } from "./PredictionReviewSection";

export function OpportunityPredictionCard({ opportunity }: { opportunity: Opportunity }) {
  const predictions = useOpportunityPredictions(opportunity.id);
  const score = useScoreOpportunity();
  const latest = predictions.data?.latest;
  const missing = [!opportunity.routeToMarket && "route to market", !opportunity.productSubgroup && "product subgroup"].filter(Boolean) as string[];
  const resolved = Boolean(opportunity.outcome);
  const probability = latest ? Number(latest.wonProbability) * 100 : null;

  const olderPredictions = predictions.data?.history.slice(1) ?? [];

  return <Card><CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle>Win probability</CardTitle><CardDescription>Decision support based on the opportunity information available when the prediction was generated.</CardDescription></div><Button onClick={() => score.mutate(opportunity.id)} disabled={score.isPending || resolved || missing.length > 0}>{score.isPending ? "Generating..." : "Generate win probability"}</Button></CardHeader><CardContent className="space-y-6">
    {resolved && <p className="text-sm text-muted-foreground">Resolved opportunities are not eligible for scoring.</p>}
    {!resolved && missing.length > 0 && <p className="text-sm text-amber-700 dark:text-amber-400">Add {missing.join(" and ")} before scoring.</p>}
    {score.error && <p role="alert" className="text-sm text-destructive">{score.error.message}</p>}
    {predictions.isLoading && <p className="text-sm text-muted-foreground">Loading prediction history...</p>}
    {predictions.error && <p role="alert" className="text-sm text-destructive">Unable to load prediction history.</p>}
    {latest ? <div className="space-y-5 rounded-lg border p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-3xl font-semibold">{probability!.toFixed(1)}%</span><p className="mt-1 text-xs text-muted-foreground">Generated {new Date(latest.predictedAt).toLocaleString()}</p></div><div className="flex flex-wrap gap-2"><Badge variant="secondary">{latest.modelVariant === "PRIMARY" ? "Standard prediction" : "Limited-history prediction"}</Badge><Badge variant="outline" className={latest.stale ? "border-amber-500 text-amber-700 dark:text-amber-400" : "border-emerald-500 text-emerald-700 dark:text-emerald-400"}>{latest.stale ? "Inputs changed" : "Current inputs"}</Badge></div></div><Progress value={probability!} aria-label={`Predicted Won probability ${probability!.toFixed(1)} percent`} />{latest.staleReason && <p className="text-sm text-amber-700 dark:text-amber-400">{latest.staleReason}. Generate a new prediction to use current inputs.</p>}<PredictionExplanation prediction={latest} /><PredictionReviewSection opportunityId={opportunity.id} prediction={latest} /></div> : !predictions.isLoading && <p className="text-sm text-muted-foreground">No prediction has been generated for this opportunity.</p>}
    {olderPredictions.length > 0 && <details className="group"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm font-medium"><span>Prediction history ({olderPredictions.length})</span><ChevronDown aria-hidden="true" className="h-4 w-4 transition-transform group-open:rotate-180" /></summary><p className="px-1 pt-2 text-xs text-muted-foreground">Input status and reviewer assessments are separate: changed inputs do not show whether an earlier prediction was accurate.</p><div className="mt-2 divide-y rounded-lg border">{olderPredictions.map((item) => <details key={item.id} className="group/history px-3 py-3"><summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-sm"><div className="flex min-w-0 items-start gap-2"><ChevronDown aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 transition-transform group-open/history:rotate-180" /><div><span className="font-medium">{(Number(item.wonProbability) * 100).toFixed(1)}% win probability</span><p className="text-xs text-muted-foreground">{item.modelVariant === "PRIMARY" ? "Standard prediction" : "Limited-history prediction"} · Older inputs</p></div></div><time className="shrink-0 text-right text-xs text-muted-foreground">{new Date(item.predictedAt).toLocaleString()}</time></summary><div className="space-y-4 pt-4 sm:pl-6"><PredictionExplanation prediction={item} /><PredictionReviewSection opportunityId={opportunity.id} prediction={item} /></div></details>)}</div></details>}
  </CardContent></Card>;
}
