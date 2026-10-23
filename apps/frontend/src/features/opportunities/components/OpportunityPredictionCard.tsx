import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useOpportunityPredictions, useScoreOpportunity } from "../hooks/useOpportunities";
import type { Opportunity } from "../services/opportunitiesApi";
import { PredictionExplanation } from "./PredictionExplanation";
import { ChevronDown } from "lucide-react";

export function OpportunityPredictionCard({ opportunity }: { opportunity: Opportunity }) {
  const predictions = useOpportunityPredictions(opportunity.id);
  const score = useScoreOpportunity();
  const latest = predictions.data?.latest;
  const missing = [!opportunity.routeToMarket && "route to market", !opportunity.productSubgroup && "product subgroup"].filter(Boolean) as string[];
  const resolved = Boolean(opportunity.outcome);
  const probability = latest ? Number(latest.wonProbability) * 100 : null;

  return <Card><CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle>Win probability</CardTitle><CardDescription>Random Forest decision support using the saved Automotive v1 model.</CardDescription></div><Button onClick={() => score.mutate(opportunity.id)} disabled={score.isPending || resolved || missing.length > 0}>{score.isPending ? "Generating..." : "Generate win probability"}</Button></CardHeader><CardContent className="space-y-4">
    {resolved && <p className="text-sm text-muted-foreground">Resolved opportunities are not eligible for scoring.</p>}
    {!resolved && missing.length > 0 && <p className="text-sm text-amber-700 dark:text-amber-400">Add {missing.join(" and ")} before scoring.</p>}
    {score.error && <p role="alert" className="text-sm text-destructive">{score.error.message}</p>}
    {predictions.isLoading && <p className="text-sm text-muted-foreground">Loading prediction history...</p>}
    {predictions.error && <p role="alert" className="text-sm text-destructive">Unable to load prediction history.</p>}
    {latest ? <div className="space-y-4 rounded-lg border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-3xl font-semibold">{probability!.toFixed(1)}%</span><div className="flex gap-2"><Badge variant="secondary">{latest.modelVariant === "PRIMARY" ? "Automotive 5" : "Limited history"}</Badge>{latest.stale && <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">Stale</Badge>}</div></div><Progress value={probability!} aria-label={`Predicted Won probability ${probability!.toFixed(1)} percent`} /><p className="text-xs text-muted-foreground">Generated {new Date(latest.predictedAt).toLocaleString()} · {latest.modelVersion}</p>{latest.staleReason && <p className="text-sm text-amber-700 dark:text-amber-400">{latest.staleReason}. Generate a new prediction to use current inputs.</p>}<PredictionExplanation prediction={latest} /></div> : !predictions.isLoading && <p className="text-sm text-muted-foreground">No prediction has been generated for this opportunity.</p>}
    {predictions.data && predictions.data.history.length > 0 && <div><div className="mb-2"><h3 className="text-sm font-medium">Prediction history</h3><p className="text-xs text-muted-foreground">Stale means saved inputs no longer match the current opportunity; it does not mean the historical prediction was incorrect.</p></div><div className="divide-y rounded-lg border">{predictions.data.history.map((item, index) => {
      const status = index === 0 ? (latest?.stale ? "Stale inputs" : "Current inputs") : "Historical snapshot";
      return <details key={item.id} className="group px-3 py-3"><summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-sm"><div className="flex min-w-0 items-start gap-2"><ChevronDown aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 transition-transform group-open:rotate-180" /><div><span className="font-medium">{(Number(item.wonProbability) * 100).toFixed(1)}% Won</span><p className="text-xs text-muted-foreground">{item.modelVariant === "PRIMARY" ? "Automotive 5" : "Limited history"} · {item.modelVersion} · {status}</p></div></div><time className="shrink-0 text-right text-xs text-muted-foreground">{new Date(item.predictedAt).toLocaleString()}</time></summary><div className="pt-4 pl-6"><PredictionExplanation prediction={item} /></div></details>;
    })}</div></div>}
  </CardContent></Card>;
}
