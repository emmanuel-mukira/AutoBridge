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

const decimal = (value: number) => value.toFixed(5);
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const usd = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value,
  );
const methodLabels = {
  PROBABILITY: "Win probability",
  VALUE: "Opportunity value",
  WEIGHTED_VALUE: "Weighted value",
  VALUE_PER_HOUR: "Weighted value/hour",
};
const fieldLabels: Record<string, string> = {
  "Opportunity Amount USD": "Opportunity amount",
  "Revenue From Client Past Two Years": "Client revenue (2 years)",
  "Route To Market": "Route to market",
  "Supplies Group": "Supplies group",
  "Supplies Subgroup": "Supplies subgroup",
};

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
  // Older API deployments can still serve operational monitoring during a rolling update.
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
  const runtime = o.runtime.filter(
    (row) => row.capacityMinutes === Number(capacity),
  );

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
        <TabsContent value="predictive" className="mt-4 space-y-6">
          <section className="space-y-2" aria-labelledby="test-performance">
            <h3 id="test-performance" className="font-semibold">
              Internal test performance
            </h3>
            <p className="text-sm text-muted-foreground">
              Both frozen Random Forest models were evaluated on the same{" "}
              {p.testCount.toLocaleString()} IBM automotive/RV test
              opportunities.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Estimate</TableHead>
                  <TableHead>95% confidence interval</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {p.models.flatMap((model) =>
                  model.metrics.map((metric) => (
                    <TableRow key={`${model.name}-${metric.label}`}>
                      <TableCell>
                        {model.name} · {model.inputs} inputs
                      </TableCell>
                      <TableCell>{metric.label}</TableCell>
                      <TableCell className="tabular-nums">
                        {decimal(metric.value)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {decimal(metric.lower)}–{decimal(metric.upper)}
                      </TableCell>
                    </TableRow>
                  )),
                )}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground">
              {p.bootstrapReplicates.toLocaleString()} stratified bootstrap
              repetitions; percentile intervals condition on the fitted models
              and observed class mix. They exclude training, customer-cluster
              and external-population uncertainty.
            </p>
            <details className="text-sm">
              <summary className="cursor-pointer font-medium">
                How to read the metrics
              </summary>
              <div className="mt-2 space-y-1 text-muted-foreground">
                {data.evaluation.metrics.map((metric) => (
                  <p key={metric.key}>
                    <strong>{metric.label}:</strong> {metric.explanation}
                  </p>
                ))}
              </div>
            </details>
            <p className="text-sm text-muted-foreground">
              Internal IBM evaluation does not establish performance for
              independent automotive suppliers. The fallback was tested on the
              full internal test set with revenue excluded; this is not a
              verified population with unavailable or unreliable client history.
              Unknown history remains distinct from verified zero revenue.
            </p>
          </section>
          <section className="space-y-2" aria-labelledby="matched-algorithms">
            <h3 id="matched-algorithms" className="font-semibold">
              Matched five-input algorithm comparison
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Algorithm</TableHead>
                  <TableHead>ROC-AUC ↑</TableHead>
                  <TableHead>Average Precision ↑</TableHead>
                  <TableHead>Brier Score ↓</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {p.algorithms.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell>
                      {row.name === "Primary RF" ? "Random Forest" : row.name}
                    </TableCell>
                    <TableCell>{decimal(row.rocAuc)}</TableCell>
                    <TableCell>{decimal(row.averagePrecision)}</TableCell>
                    <TableCell>{decimal(row.brier)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-sm text-muted-foreground">
              Random Forest produced the strongest test point estimates, with
              XGBoost close. This post-selection internal comparison does not
              establish statistical superiority. All three use the same five
              inputs and test rows; the four-input operational fallback is
              evaluated separately above.
            </p>
          </section>
          <section
            className="space-y-3"
            aria-labelledby="probability-reliability"
          >
            <h3 id="probability-reliability" className="font-semibold">
              Probability reliability
            </h3>
            <div className="grid min-w-0 gap-5 lg:grid-cols-2">
              {p.models.map((model) => (
                <div key={model.name} className="min-w-0 space-y-2">
                  <h4 className="text-sm font-medium">{model.name}</h4>
                  <ChartContainer
                    className="h-64 w-full min-w-0 aspect-auto"
                    config={{
                      observedWinRate: {
                        label: "Observed win rate",
                        color: "var(--primary)",
                      },
                    }}
                  >
                    <LineChart
                      accessibilityLayer
                      data={model.reliability.filter((bin) => bin.count > 0)}
                      margin={{ top: 10, right: 15, bottom: 22, left: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        type="number"
                        dataKey="meanPrediction"
                        domain={[0, 1]}
                        tickFormatter={percent}
                        label={{
                          value: "Mean predicted probability",
                          position: "bottom",
                          offset: 3,
                          fontSize: 11,
                        }}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis
                        domain={[0, 1]}
                        tickFormatter={percent}
                        width={46}
                        tick={{ fontSize: 10 }}
                        label={{
                          value: "Observed win rate",
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
                                ? `${row.label} · n=${row.count.toLocaleString()} · predicted ${percent(row.meanPrediction)}`
                                : "";
                            }}
                            formatter={(value) => (
                              <span>
                                Observed win rate: {percent(Number(value))}
                              </span>
                            )}
                          />
                        }
                      />
                      <Line
                        type="linear"
                        dataKey="observedWinRate"
                        name="Observed win rate"
                        stroke="var(--color-observedWinRate)"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ChartContainer>
                  <p className="text-xs text-muted-foreground">
                    Dashed diagonal: ideal reliability. Hover over a point for
                    its bin support.
                  </p>
                </div>
              ))}
            </div>
            <details className="text-sm">
              <summary className="cursor-pointer font-medium">
                Sample support by probability band
              </summary>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Band</TableHead>
                    {p.models.map((model) => (
                      <TableHead key={model.name}>{model.name} n</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {p.models[0].reliability.map((bin, index) => (
                    <TableRow key={bin.label}>
                      <TableCell>{bin.label}</TableCell>
                      {p.models.map((model) => (
                        <TableCell key={model.name}>
                          {model.reliability[index].count.toLocaleString()}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </details>
            <p className="text-sm text-muted-foreground">
              Reliability is imperfect; sparse high-probability bins require
              caution. Empty bins are omitted from the curves. Bins include
              their upper bound; only the first includes zero. Probability
              errors can distort weighted planning values. Both models retain
              their original raw probabilities.
            </p>
          </section>
          <section className="space-y-3" aria-labelledby="global-shap">
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
                      {model.name}
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
                margin={{ left: 0, right: 24, bottom: 22 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  label={{
                    value: "Mean absolute SHAP (pp)",
                    position: "bottom",
                    fontSize: 10,
                    offset: 3,
                  }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={118}
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
                          {Number(value).toFixed(4)} pp ·{" "}
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
              Revenue and opportunity amount dominate primary attribution;
              amount dominates the fallback. Bars show average absolute
              contributions in probability percentage points. Tooltip shares
              normalize each model’s total attribution magnitude; they are not
              variance explained or causal effects.
            </p>
            <p className="text-xs text-muted-foreground">
              Same {p.shapSample} test opportunities and {p.shapBackground}{" "}
              training-background opportunities per model. Encoded contributions
              are grouped before absolute averaging. Correlated product
              categories and background choice affect attribution;
              source-specific associations may differ in real buying behaviour.
            </p>
          </section>
          <details className="border-t pt-4">
            <summary className="cursor-pointer text-sm font-semibold">
              Separate outcome monitoring · application and IBM demonstration
            </summary>
            <div className="mt-4">{children}</div>
          </details>
        </TabsContent>
        <TabsContent value="optimization" className="mt-4 space-y-6">
          <section className="space-y-3" aria-labelledby="optimization-summary">
            <h3 id="optimization-summary" className="font-semibold">
              Synthetic weekly planning evaluation
            </h3>
            <p className="text-sm text-muted-foreground">
              {o.scenarios} simulated weeks · 10–200 candidate activities ·
              weekly capacities 1–80 hours with completed effort deducted · at
              most one action per opportunity. Identical pools and remaining
              capacity were supplied to MCKP and all four greedy rules.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Check</TableHead>
                  <TableHead>Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Capacity and group feasibility</TableCell>
                  <TableCell>
                    {o.feasibleOutputs.toLocaleString()} /{" "}
                    {o.feasibleOutputs.toLocaleString()} method/scenario outputs
                    feasible · {o.feasibilityViolations} violations
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    Independent exhaustive optimality · 1–12 activities
                  </TableCell>
                  <TableCell>
                    {o.optimality.passed} / {o.optimality.tested} instances
                    matched · {o.optimality.failed} failed
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Separate deterministic test suite</TableCell>
                  <TableCell>
                    {o.deterministicTests.passed} named cases passed ·{" "}
                    {o.deterministicTests.failed} failed ·{" "}
                    {o.deterministicTests.skipped} skipped
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground">
              Exhaustive instances are distinct from named test-suite cases;
              coverage was not measured. Optimality checks cover small bounded
              instances, not every possible workload.
            </p>
          </section>
          <section className="space-y-2" aria-labelledby="greedy-comparison">
            <h3 id="greedy-comparison" className="font-semibold">
              MCKP improvement over greedy baselines
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Greedy rule</TableHead>
                  <TableHead>Median relative gain</TableHead>
                  <TableHead>MCKP strict wins</TableHead>
                  <TableHead>Mean gap (USD)</TableHead>
                  <TableHead>Worst gap (USD)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {o.baselines.map((row) => (
                  <TableRow key={row.method}>
                    <TableCell className="whitespace-nowrap">
                      {methodLabels[row.method]}
                    </TableCell>
                    <TableCell>
                      {row.medianImprovementPercent.toFixed(3)}%
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {row.strictWins}/{o.scenarios} (
                      {((row.strictWins / o.scenarios) * 100).toFixed(1)}%)
                    </TableCell>
                    <TableCell>{usd(row.meanGapUsd)}</TableCell>
                    <TableCell>{usd(row.worstGapUsd)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground">
              Relative gain = (MCKP − greedy) / greedy × 100, summarized over{" "}
              {o.definedPercentageCases} positive-baseline scenarios per rule.
              The {o.zeroDenominatorCases} zero-denominator cases were all ties
              and are excluded from percentages. Strict-win frequencies and
              absolute gaps include all {o.scenarios} scenarios. Gaps are
              probability-weighted planning values in USD.
            </p>
            <p className="text-sm text-muted-foreground">
              MCKP tied weighted value/hour in{" "}
              {o.baselines.find((row) => row.method === "VALUE_PER_HOUR")?.ties}
              /{o.scenarios} scenarios and improved its objective in the
              remaining{" "}
              {
                o.baselines.find((row) => row.method === "VALUE_PER_HOUR")
                  ?.strictWins
              }
              . No greedy result exceeded MCKP. The stronger heuristic often
              matches MCKP, so added benefit depends on the scenario.
            </p>
          </section>
          <section className="space-y-3" aria-labelledby="runtime">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 id="runtime" className="font-semibold">
                Measured local runtime
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
              Five warm-ups and 30 measured calls per configuration; P95 uses
              nearest rank. Whole optimizer call includes dynamic programming,
              reconstruction and four greedy comparisons, excluding database
              access and model inference. Fixed pools per candidate count; local
              warm-process measurements on {o.runtimeCpu}, Node {o.runtimeNode}.
              These are not cloud timings.
            </p>
            <p className="text-sm text-muted-foreground">
              Synthetic computational results describe the declared workload.
              Probability-weighted value is a planning objective, not realized
              revenue or a measured increase in salesperson productivity.
              Follow-up benefits are fixed per opportunity, not estimated causal
              effects of individual actions.
            </p>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
