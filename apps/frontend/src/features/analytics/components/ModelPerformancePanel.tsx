import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useModelPerformance } from "../hooks/useAnalytics";

const percent = (value: number | null) =>
  value === null ? "—" : `${(value * 100).toFixed(1)}%`;

export function ModelPerformancePanel() {
  const [source, setSource] = useState<"demo" | "application">("application");
  const query = useModelPerformance();
  if (query.isPending) return <Skeleton className="h-80 w-full" />;
  if (query.isError)
    return (
      <Alert variant="destructive">
        <AlertTitle>Model performance unavailable</AlertTitle>
        <AlertDescription>
          Unable to load evaluation results.{" "}
          <Button variant="outline" size="sm" onClick={() => query.refetch()}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  const { evaluation } = query.data;
  const reliability =
    source === "demo"
      ? query.data.demonstrationReliability
      : query.data.reliability;
  const high = reliability.atLeast70;
  const chart = reliability.bins.filter((bin) => bin.count > 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{query.data.modelName}</h2>
          <p className="text-sm text-muted-foreground">{evaluation.source}</p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>{query.data.modelVersion}</p>
          <p>
            {query.isFetching
              ? "Updating…"
              : `Fetched ${new Date(query.dataUpdatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}
          </p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {evaluation.metrics.map((metric) => (
          <Card key={metric.key}>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium">{metric.label}</h3>
              <p className="mt-1 text-2xl font-bold tabular-nums text-primary">
                {metric.value.toFixed(5)}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {metric.explanation}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{evaluation.limitation}</p>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Outcome monitoring and prediction reliability</CardTitle>
            <div
              className="flex w-full flex-wrap rounded-lg border bg-muted/40 p-1 sm:w-auto"
              aria-label="Reliability data source"
            >
              <Button
                size="sm"
                variant={source === "demo" ? "secondary" : "ghost"}
                aria-pressed={source === "demo"}
                onClick={() => setSource("demo")}
              >
                IBM demonstration
              </Button>
              <Button
                size="sm"
                variant={source === "application" ? "secondary" : "ghost"}
                aria-pressed={source === "application"}
                onClick={() => setSource("application")}
              >
                Application outcomes
              </Button>
            </div>
          </div>
          <CardDescription>{reliability.source}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-lg border p-3 text-sm">
            <h3 className="font-medium">Outcome monitoring readiness</h3>
            <p className="mt-1 text-muted-foreground">
              {reliability.eligible} scored opportunities with known outcomes ·{" "}
              {reliability.bins.reduce((sum, bin) => sum + bin.won, 0)} Won ·{" "}
              {reliability.bins.reduce((sum, bin) => sum + bin.lost, 0)} Lost
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <h3 className="text-sm font-medium">
              Predicted at least 70% likely to win
            </h3>
            {high.count ? (
              <>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {high.won} of {high.count} won
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {high.lost} lost · {percent(high.observedWinRate)} observed
                  win rate · {percent(high.meanPrediction)} average predicted
                  probability
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No eligible resolved opportunities in this range yet.
              </p>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Won and Lost outcomes by the probability predicted before each opportunity closed.
          </p>
          {source === "application" && (
            <p className="text-xs text-muted-foreground">
              Seeded Demo outcome records are illustrative sales results, not independent evidence of model accuracy.
            </p>
          )}
          {chart.length ? (
            <>
              <ChartContainer
                className="h-64 w-full min-w-0 aspect-auto"
                config={{
                  won: { label: "Won", color: "#16a34a" },
                  lost: { label: "Lost", color: "#ef4444" },
                }}
              >
                <BarChart
                  accessibilityLayer
                  data={chart}
                  margin={{ left: 0, right: 12, top: 12 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} minTickGap={0} interval={0} angle={-35} textAnchor="end" height={48} />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={44}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => (
                          <span>
                            {name}: {Number(value)}
                          </span>
                        )}
                      />
                    }
                  />
                  <Legend />
                  <Bar
                    name="Won"
                    dataKey="won"
                    fill="var(--color-won)"
                    radius={[3, 3, 0, 0]}
                    isAnimationActive={false}
                  />
                  <Bar
                    name="Lost"
                    dataKey="lost"
                    fill="var(--color-lost)"
                    radius={[3, 3, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ChartContainer>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prediction band</TableHead>
                      <TableHead>Resolved</TableHead>
                      <TableHead>Won</TableHead>
                      <TableHead>Lost</TableHead>
                      <TableHead>Average prediction</TableHead>
                      <TableHead>Actual win rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chart.map((bin) => (
                        <TableRow key={bin.label}>
                          <TableCell>{bin.label}</TableCell>
                          <TableCell>{bin.count}</TableCell>
                          <TableCell>{bin.won}</TableCell>
                          <TableCell>{bin.lost}</TableCell>
                          <TableCell>{percent(bin.meanPrediction)}</TableCell>
                          <TableCell>{percent(bin.observedWinRate)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No eligible outcomes yet. The chart will appear when opportunities
              with a saved primary-model prediction are recorded as Won or Lost.
            </div>
          )}
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>{reliability.explanation}</p>
            <p>{reliability.warning}</p>
            <p>
              Band lower bounds are included; upper bounds are excluded, except
              100%.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
