import { useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ModelPerformance } from "../types";

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const methodLabels = {
  PROBABILITY: "Win probability",
  VALUE: "Opportunity value",
  WEIGHTED_VALUE: "Weighted value",
  VALUE_PER_HOUR: "Weighted value/hour",
} as const;
const fieldLabels: Record<string, string> = {
  "Opportunity Amount USD": "Opportunity amount",
  "Revenue From Client Past Two Years": "Client revenue (2 years)",
  "Route To Market": "Route to market",
  "Supplies Group": "Supplies group",
  "Supplies Subgroup": "Supplies subgroup",
};

function ModelCard({
  model,
}: {
  model: ModelPerformance["researchEvaluation"]["predictive"]["models"][number];
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {model.name === "Fallback RF"
            ? "Limited-History Random Forest"
            : "Primary Random Forest"}{" "}
          <span className="font-normal text-muted-foreground">
            · {model.inputs} inputs
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-2 pt-0">
        {model.metrics.map((metric) => (
          <div key={metric.label} className="rounded-md bg-muted/50 p-2">
            <p className="text-xs text-muted-foreground">{metric.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {metric.value.toFixed(3)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ResearchEvaluationPanel({
  data,
  children,
}: {
  data: ModelPerformance;
  children: ReactNode;
}) {
  const [modelName, setModelName] = useState("Primary RF");
  const [capacity, setCapacity] = useState("4800");
  const research = data.researchEvaluation;
  if (!research)
    return (
      <div className="space-y-4">
        <p role="status">
          Research evaluation unavailable. Refresh after the API is updated.
        </p>
        {children}
      </div>
    );
  const p = research.predictive;
  const o = research.optimization;
  const selected =
    p.models.find((model) => model.name === modelName) ?? p.models[0];
  const importance = [...selected.shap]
    .sort((a, b) => b.percentagePoints - a.percentagePoints)
    .map((row) => ({
      ...row,
      label: fieldLabels[row.attribute] ?? row.attribute,
    }));
  const reliability = p.models.flatMap((model) =>
    model.reliability
      .filter((bin) => bin.count > 0)
      .map((bin) => ({
        ...bin,
        model: model.name,
        predicted: bin.meanPrediction,
        observed: bin.observedWinRate,
      })),
  );
  const runtime = o.runtime.filter(
    (row) => row.capacityMinutes === Number(capacity),
  );
  const density = o.baselines.find((row) => row.method === "VALUE_PER_HOUR");
  return (
    <div className="min-w-0 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">
          Predictive and Optimization Evaluation
        </h2>
        <p className="text-xs text-muted-foreground">
          Fixed research results · {research.modelVersion} · {research.version}{" "}
          · Separate from live sales analytics
        </p>
      </div>
      <Tabs defaultValue="predictive">
        <TabsList
          className="h-auto flex-wrap justify-start"
          aria-label="Evaluation type"
        >
          <TabsTrigger value="predictive">Predictive Evaluation</TabsTrigger>
          <TabsTrigger value="optimization">
            Optimization Evaluation
          </TabsTrigger>
        </TabsList>
        <TabsContent value="predictive" className="mt-4 space-y-5">
          <section className="space-y-3" aria-labelledby="model-performance">
            <div>
              <h3 id="model-performance" className="font-semibold">
                Model performance
              </h3>
              <p className="text-sm text-muted-foreground">
                Three internal test metrics across{" "}
                {p.testCount.toLocaleString()} IBM automotive/RV opportunities.
                Higher ROC-AUC and Average Precision are better; lower Brier
                Score is better.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {p.models.map((model) => (
                <ModelCard key={model.name} model={model} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Confidence intervals remain in the evaluation artifacts. This is
              internal IBM dataset evidence, not external supplier validation.
              The limited-history model was evaluated on the full test set with
              revenue excluded, not a verified missing-history subgroup.
            </p>
          </section>
          <section
            className="space-y-2"
            aria-labelledby="probability-reliability"
          >
            <h3 id="probability-reliability" className="font-semibold">
              Prediction reliability
            </h3>
            <p className="text-sm text-muted-foreground">
              Predicted win probabilities are compared with observed win
              frequencies by probability band.
            </p>
            <ChartContainer
              className="h-72 w-full min-w-0 aspect-auto"
              config={{
                primary: {
                  label: "Primary Random Forest",
                  color: "var(--primary)",
                },
                fallback: {
                  label: "Limited-history Random Forest",
                  color: "#f59e0b",
                },
              }}
            >
              <LineChart
                accessibilityLayer
                data={reliability}
                margin={{ top: 12, right: 16, bottom: 30, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="predicted"
                  domain={[0, 1]}
                  tickFormatter={percent}
                  tick={{ fontSize: 10 }}
                  label={{
                    value: "Predicted win probability",
                    position: "bottom",
                    offset: 8,
                    fontSize: 11,
                  }}
                />
                <YAxis
                  domain={[0, 1]}
                  tickFormatter={percent}
                  width={48}
                  tick={{ fontSize: 10 }}
                  label={{
                    value: "Observed win frequency",
                    angle: -90,
                    position: "insideLeft",
                    fontSize: 11,
                  }}
                />
                <ReferenceLine
                  segment={[
                    { x: 0, y: 0 },
                    { x: 1, y: 1 },
                  ]}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="5 5"
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_label, payload) => {
                        const row = payload[0]?.payload;
                        return row
                          ? `${row.model} · ${row.label} · n=${row.count.toLocaleString()}`
                          : "";
                      }}
                      formatter={(value) => (
                        <span>Observed: {percent(Number(value))}</span>
                      )}
                    />
                  }
                />
                <Line
                  data={reliability.filter((row) => row.model === "Primary RF")}
                  type="linear"
                  dataKey="observed"
                  name="Primary Random Forest"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  isAnimationActive={false}
                />
                <Line
                  data={reliability.filter(
                    (row) => row.model === "Fallback RF",
                  )}
                  type="linear"
                  dataKey="observed"
                  name="Limited-history Random Forest"
                  stroke="var(--color-fallback)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  isAnimationActive={false}
                />
                <Legend />
              </LineChart>
            </ChartContainer>
            <p className="text-xs text-muted-foreground">
              Dashed diagonal indicates ideal calibration. Empty probability
              bins are omitted, not treated as zero. Sigmoid calibration changed
              validation Brier Score only from 0.12921 to 0.12919, so the
              original probabilities were retained.
            </p>
          </section>
          <section className="space-y-2" aria-labelledby="global-shap">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 id="global-shap" className="font-semibold">
                Global SHAP importance
              </h3>
              <Select value={modelName} onValueChange={setModelName}>
                <SelectTrigger className="w-48" aria-label="SHAP model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {p.models.map((model) => (
                    <SelectItem key={model.name} value={model.name}>
                      {model.name === "Fallback RF"
                        ? "Limited-history RF"
                        : "Primary RF"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ChartContainer
              className="h-64 w-full min-w-0 aspect-auto"
              config={{
                percentagePoints: {
                  label: "Mean absolute SHAP (pp)",
                  color: "var(--primary)",
                },
              }}
            >
              <BarChart
                accessibilityLayer
                layout="vertical"
                data={importance}
                margin={{ left: 0, right: 24, bottom: 24 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  label={{
                    value: "Mean absolute SHAP (percentage points)",
                    position: "bottom",
                    fontSize: 10,
                    offset: 5,
                  }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={125}
                  tick={{ fontSize: 10 }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_label, payload) =>
                        payload[0]?.payload.attribute
                      }
                      formatter={(value, _name, item) => (
                        <span>
                          {Number(value).toFixed(3)} pp ·{" "}
                          {percent(item.payload.share)} of total attribution
                        </span>
                      )}
                    />
                  }
                />
                <Bar
                  dataKey="percentagePoints"
                  fill="var(--color-percentagePoints)"
                  radius={[0, 3, 3, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ChartContainer>
            <p className="text-sm text-muted-foreground">
              {modelName === "Fallback RF"
                ? "Opportunity amount and route to market account for approximately 90.2%"
                : "Previous client revenue and opportunity amount account for approximately 81.5%"}{" "}
              of total mean absolute attribution. These contributions describe
              model behaviour, not causal relationships.
            </p>
          </section>
          <details className="border-t pt-3">
            <summary className="cursor-pointer text-sm font-medium">
              Live outcome monitoring
            </summary>
            <div className="mt-4">{children}</div>
          </details>
        </TabsContent>
        <TabsContent value="optimization" className="mt-4 space-y-5">
          <section className="space-y-3" aria-labelledby="optimization-summary">
            <h3 id="optimization-summary" className="font-semibold">
              Optimization evaluation
            </h3>
            <p className="text-sm text-muted-foreground">
              Synthetic computational testing of weekly planning quality; these
              results do not measure actual revenue or salesperson productivity.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">
                    Simulated weeks
                  </p>
                  <p className="mt-1 text-2xl font-semibold">{o.scenarios}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">
                    Exhaustive optimality
                  </p>
                  <p className="mt-1 text-2xl font-semibold">
                    {o.optimality.passed}/{o.optimality.tested}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    small instances passed
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">
                    Feasibility violations
                  </p>
                  <p className="mt-1 text-2xl font-semibold">
                    {o.feasibilityViolations}
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>
          <section className="space-y-2" aria-labelledby="greedy-comparison">
            <h3 id="greedy-comparison" className="font-semibold">
              MCKP compared with greedy baselines
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Greedy baseline</TableHead>
                  <TableHead>Median improvement</TableHead>
                  <TableHead>MCKP strict wins</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {o.baselines.map((row) => (
                  <TableRow key={row.method}>
                    <TableCell>{methodLabels[row.method]}</TableCell>
                    <TableCell>
                      {row.medianImprovementPercent.toFixed(2)}%
                    </TableCell>
                    <TableCell>
                      {((row.strictWins / o.scenarios) * 100).toFixed(1)}% (
                      {row.strictWins}/{o.scenarios})
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground">
              Relative improvements exclude {o.zeroDenominatorCases} cases where
              the greedy objective was zero; percentages use{" "}
              {o.definedPercentageCases} positive-baseline cases.
            </p>
            <p className="text-sm text-muted-foreground">
              MCKP matched weighted value/hour in {density?.ties}/{o.scenarios}{" "}
              scenarios and achieved a better objective in {density?.strictWins}{" "}
              ({(((density?.strictWins ?? 0) / o.scenarios) * 100).toFixed(1)}
              %).
            </p>
          </section>
          <section className="space-y-2" aria-labelledby="runtime">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 id="runtime" className="font-semibold">
                Local algorithm runtime
              </h3>
              <Select value={capacity} onValueChange={setCapacity}>
                <SelectTrigger className="w-48" aria-label="Runtime capacity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[60, 1500, 4800].map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>
                      {minutes / 60} hours capacity
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ChartContainer
              className="h-64 w-full min-w-0 aspect-auto"
              config={{
                medianMs: { label: "Median (ms)", color: "var(--primary)" },
                p95Ms: { label: "P95 (ms)", color: "var(--muted-foreground)" },
              }}
            >
              <LineChart
                accessibilityLayer
                data={runtime}
                margin={{ left: 0, right: 16, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="candidateCount"
                  type="number"
                  domain={[10, 200]}
                  ticks={[10, 25, 50, 100, 200]}
                  label={{
                    value: "Candidate activities",
                    position: "bottom",
                    offset: 3,
                    fontSize: 11,
                  }}
                />
                <YAxis
                  width={48}
                  label={{
                    value: "Time (ms)",
                    angle: -90,
                    position: "insideLeft",
                    fontSize: 11,
                  }}
                />
                <Legend verticalAlign="top" />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_label, payload) =>
                        `${payload[0]?.payload.candidateCount} activities`
                      }
                      formatter={(value, name) => (
                        <span>
                          {name}: {Number(value).toFixed(3)} ms
                        </span>
                      )}
                    />
                  }
                />
                <Line
                  type="linear"
                  name="Median"
                  dataKey="medianMs"
                  stroke="var(--color-medianMs)"
                  isAnimationActive={false}
                />
                <Line
                  type="linear"
                  name="P95"
                  dataKey="p95Ms"
                  stroke="var(--color-p95Ms)"
                  strokeDasharray="5 5"
                  isAnimationActive={false}
                />
              </LineChart>
            </ChartContainer>
            <p className="text-xs text-muted-foreground">
              Measured locally with five warm-ups and 30 calls per
              configuration; results exclude database access and model
              inference.
            </p>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
