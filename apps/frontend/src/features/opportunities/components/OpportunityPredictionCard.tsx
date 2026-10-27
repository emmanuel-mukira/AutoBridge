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
    {latest ? <div className="space-y-5 rounded-lg border bg-gradient-to-br from-background to-muted/20 p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-4xl font-semibold tracking-tight">{probability!.toFixed(1)}%</span><p className="mt-1 text-xs text-muted-foreground">Generated {new Date(latest.predictedAt).toLocaleString()}</p></div><div className="flex flex-wrap gap-2"><Badge variant="secondary">{latest.modelVariant === "PRIMARY" ? "Standard prediction" : "Limited-history prediction"}</Badge><Badge variant="outline" className={latest.stale ? "border-amber-500 text-amber-700 dark:text-amber-400" : "border-emerald-500 text-emerald-700 dark:text-emerald-400"}>{latest.stale ? "Inputs changed" : "Current inputs"}</Badge><Badge variant="outline">{latest.reviews.length ? `${latest.reviews.length} review${latest.reviews.length === 1 ? "" : "s"}` : "Not reviewed"}</Badge></div></div><Progress value={probability!} aria-label={`Predicted Won probability ${probability!.toFixed(1)} percent`} />{latest.staleReason && <p className="text-sm text-amber-700 dark:text-amber-400">{latest.staleReason}. Generate a new prediction to use current inputs.</p>}<PredictionExplanation prediction={latest} /><PredictionReviewSection opportunityId={opportunity.id} prediction={latest} /></div> : !predictions.isLoading && <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">No prediction has been generated for this opportunity.</p>}
    {olderPredictions.length > 0 && <section aria-labelledby="prediction-history-heading"><div className="mb-2 flex items-center justify-between"><h3 id="prediction-history-heading" className="text-sm font-semibold">Prediction history</h3><span className="text-xs text-muted-foreground">{olderPredictions.length} saved</span></div><div className="divide-y rounded-lg border">{olderPredictions.map((item) => <details key={item.id} className="group/history"><summary className="grid cursor-pointer list-none grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-3 hover:bg-muted/40 sm:px-4"><ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform group-open/history:rotate-180" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xl font-semibold">{(Number(item.wonProbability) * 100).toFixed(1)}%</span><Badge variant="outline" className="border-slate-400 text-slate-600 dark:text-slate-300">Historical inputs</Badge><Badge variant="outline">{item.reviews.length ? `${item.reviews.length} review${item.reviews.length === 1 ? "" : "s"}` : "Not reviewed"}</Badge></div><p className="text-xs text-muted-foreground">{item.modelVariant === "PRIMARY" ? "Standard prediction" : "Limited-history prediction"}</p></div><time className="shrink-0 text-right text-xs text-muted-foreground">{new Date(item.predictedAt).toLocaleDateString()}<span className="hidden sm:inline"> · {new Date(item.predictedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></time></summary><div className="space-y-5 border-t bg-muted/10 p-4 sm:px-10"><PredictionExplanation prediction={item} /><PredictionReviewSection opportunityId={opportunity.id} prediction={item} /></div></details>)}</div></section>}
  </CardContent></Card>;
}
