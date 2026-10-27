import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  useOpportunityPredictions,
  useScoreOpportunity,
} from "../hooks/useOpportunities";
import type { Opportunity } from "../services/opportunitiesApi";
import { PredictionExplanation } from "./PredictionExplanation";
import { PredictionReviewSection } from "./PredictionReviewSection";

export function OpportunityPredictionCard({
  opportunity,
}: {
  opportunity: Opportunity;
}) {
  const predictions = useOpportunityPredictions(opportunity.id);
  const score = useScoreOpportunity();
  const latest = predictions.data?.latest;
  const missing = [
    !opportunity.routeToMarket && "route to market",
    !opportunity.productSubgroup && "product subgroup",
  ].filter(Boolean) as string[];
  const resolved = Boolean(opportunity.outcome);
  const probability = latest ? Number(latest.wonProbability) * 100 : null;
  const olderPredictions = predictions.data?.history.slice(1) ?? [];

  return (
    <section
      className="space-y-4"
      aria-labelledby="prediction-workspace-heading"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="prediction-workspace-heading"
            className="text-2xl font-bold tracking-tight"
          >
            Prediction workspace
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Win probability, model factors and human assessment.
          </p>
        </div>
        <Button
          onClick={() => score.mutate(opportunity.id)}
          disabled={score.isPending || resolved || missing.length > 0}
        >
          {score.isPending ? "Generating..." : "Generate win probability"}
        </Button>
      </div>
      {resolved && (
        <p className="text-sm text-muted-foreground">
          Resolved opportunities are not eligible for scoring.
        </p>
      )}
      {!resolved && missing.length > 0 && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Add {missing.join(" and ")} before scoring.
        </p>
      )}
      {score.error && (
        <p role="alert" className="text-sm text-destructive">
          {score.error.message}
        </p>
      )}
      {predictions.isLoading && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Loading prediction history...
          </CardContent>
        </Card>
      )}
      {predictions.error && (
        <p role="alert" className="text-sm text-destructive">
          Unable to load prediction history.
        </p>
      )}
      {latest ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] lg:items-start">
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-gradient-to-br from-background to-muted/30">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardDescription>Predicted chance of winning</CardDescription>
                  <CardTitle className="mt-1 text-5xl font-bold tracking-tight">
                    {probability!.toFixed(1)}%
                  </CardTitle>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Generated {new Date(latest.predictedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex max-w-xs flex-wrap justify-end gap-2">
                  <Badge variant="secondary">
                    {latest.modelVariant === "PRIMARY"
                      ? "Standard"
                      : "Limited history"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      latest.stale
                        ? "border-amber-500 text-amber-700 dark:text-amber-400"
                        : "border-emerald-500 text-emerald-700 dark:text-emerald-400"
                    }
                  >
                    {latest.stale ? "Inputs changed" : "Current inputs"}
                  </Badge>
                </div>
              </div>
              <Progress
                className="mt-4"
                value={probability!}
                aria-label={`Predicted Won probability ${probability!.toFixed(1)} percent`}
              />
              {latest.staleReason && (
                <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
                  The inputs used for this saved prediction have changed.
                  Generate a new prediction to evaluate the current inputs.
                </p>
              )}
            </CardHeader>
            <CardContent className="pt-6">
              <PredictionExplanation prediction={latest} />
            </CardContent>
          </Card>
          <Card className="border-primary/20 lg:sticky lg:top-4">
            <CardContent className="pt-6">
              <PredictionReviewSection
                opportunityId={opportunity.id}
                prediction={latest}
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        !predictions.isLoading &&
        !predictions.error && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No prediction has been generated for this opportunity.
            </CardContent>
          </Card>
        )
      )}
      {olderPredictions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Prediction history</CardTitle>
                <CardDescription>
                  Saved inputs, explanations and reviews remain unchanged.
                </CardDescription>
              </div>
              <Badge variant="outline">{olderPredictions.length} saved</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y rounded-md border">
              {olderPredictions.map((item) => (
                <details key={item.id} className="group/history">
                  <summary className="grid cursor-pointer list-none grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-3 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4">
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open/history:rotate-180" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xl font-semibold">
                          {(Number(item.wonProbability) * 100).toFixed(1)}%
                        </span>
                        <Badge variant="outline">Historical inputs</Badge>
                        <Badge variant="outline">
                          {item.reviews.length
                            ? `${item.reviews.length} review${item.reviews.length === 1 ? "" : "s"}`
                            : "Not reviewed"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.modelVariant === "PRIMARY"
                          ? "Standard"
                          : "Limited history"}
                      </p>
                    </div>
                    <time className="shrink-0 text-right text-xs text-muted-foreground">
                      {new Date(item.predictedAt).toLocaleDateString()}
                      <span className="hidden sm:inline">
                        {" · "}
                        {new Date(item.predictedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </time>
                  </summary>
                  <div className="grid gap-6 border-t bg-muted/10 p-4 lg:grid-cols-2 lg:p-6">
                    <PredictionExplanation prediction={item} />
                    <PredictionReviewSection
                      opportunityId={opportunity.id}
                      prediction={item}
                      readOnly
                    />
                  </div>
                </details>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
