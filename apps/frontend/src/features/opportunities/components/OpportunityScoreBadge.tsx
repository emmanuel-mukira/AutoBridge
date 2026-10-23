import { Badge } from "@/components/ui/badge";
import type { OpportunityPredictionSummary } from "../services/opportunitiesApi";

export function OpportunityScoreBadge({ prediction }: { prediction: OpportunityPredictionSummary | null }) {
  if (!prediction) return <Badge variant="outline" className="text-muted-foreground">Not scored</Badge>;
  return <span className="flex flex-wrap items-center gap-1">
    <Badge variant="secondary">{(Number(prediction.wonProbability) * 100).toFixed(1)}% Won</Badge>
    {prediction.stale && <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">Stale</Badge>}
  </span>;
}
