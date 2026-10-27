import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, BarChart3, BrainCircuit, CircleDollarSign, ExternalLink, Target } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { useAuth } from "@/app/auth/useAuth";
import { useUIStore } from "@/app/store";
import { TablePagination } from "@/components/shared/TablePagination";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricCard } from "@/features/analytics/components/MetricCard";
import { useDecisionSupport } from "@/features/analytics/hooks/useAnalytics";
import type { DecisionSupportFilters, PredictionStatus } from "@/features/analytics/types";
import { useOpportunityOwners, useOpportunityProducts } from "@/features/opportunities/hooks/useOpportunities";
import { formatMoney } from "@/lib/currency";

const probabilityConfig = { count: { label: "Opportunities", color: "var(--primary)" } } satisfies ChartConfig;
const statusLabels: Record<PredictionStatus, string> = { CURRENT: "Current", STALE: "Stale", UNSCORED: "Not scored" };
const statusClasses: Record<PredictionStatus, string> = {
  CURRENT: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  STALE: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  UNSCORED: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
};

export default function DecisionSupport() {
  const { user } = useAuth();
  const displayCurrency = useUIStore((state) => state.displayCurrency);
  const [filters, setFilters] = useState<DecisionSupportFilters>({ sort: "WEIGHTED_VALUE", page: 1, limit: 10 });
  const analytics = useDecisionSupport(filters);
  const owners = useOpportunityOwners();
  const products = useOpportunityProducts();
  const data = analytics.data;

  const updateFilters = (next: Partial<DecisionSupportFilters>) => setFilters((current) => ({ ...current, ...next, page: next.page ?? 1 }));
  if (analytics.isLoading) return <div className="space-y-5"><Skeleton className="h-20 w-full" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32" />)}</div><Skeleton className="h-[32rem]" /></div>;
  if (analytics.isError || !data) return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Decision support unavailable</AlertTitle><AlertDescription>{analytics.error instanceof Error ? analytics.error.message : "Unable to load prediction analytics."}</AlertDescription></Alert>;

  const money = (value: string) => formatMoney(Number(value), "USD", displayCurrency, Number(data.currencyBasis.kesPerUsd));
  const coverage = data.summary.scoringCoveragePercent === null ? "No eligible opportunities" : `${data.summary.currentPredictions} of ${data.summary.eligibleOpenOpportunities} (${data.summary.scoringCoveragePercent}%)`;
  const coverageRows = [
    { label: "Current", value: data.charts.coverage.current, className: "bg-emerald-500" },
    { label: "Stale", value: data.charts.coverage.stale, className: "bg-amber-500" },
    { label: "Not scored", value: data.charts.coverage.unscored, className: "bg-slate-400" },
  ];
  const maxCoverage = Math.max(1, ...coverageRows.map((item) => item.value));

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Decision Support</h1>
        <p className="mt-1 text-sm text-muted-foreground">Current prediction coverage and indicative commercial prioritization for the open pipeline.</p>
      </div>

      <section aria-labelledby="prediction-overview-heading">
        <h2 id="prediction-overview-heading" className="sr-only">Prediction overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Scoring coverage" value={coverage} description="Current predictions among eligible open opportunities" icon={Target} />
          <MetricCard title="Needs attention" value={data.summary.needsAttention} description={`${data.summary.stalePredictions} stale · ${data.summary.unscoredOpportunities} not scored`} icon={AlertTriangle} />
          <MetricCard title="Current predictions" value={data.summary.currentPredictions} description="One latest valid prediction per open opportunity" icon={BrainCircuit} />
          <MetricCard title="Probability-weighted pipeline" value={money(data.summary.probabilityWeightedPipelineUsd)} description="Indicative measure; current scores only" icon={CircleDollarSign} />
        </div>
      </section>

      <section aria-labelledby="prioritization-heading">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle id="prioritization-heading">Opportunity prioritization</CardTitle>
            <CardDescription>Probability and weighted value are separate indicators. Follow-up urgency is operational and is not a model input.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 border-y bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
            {user?.role === "ADMIN" && <Select value={filters.ownerId?.toString() ?? "all"} onValueChange={(value) => updateFilters({ ownerId: value === "all" ? undefined : Number(value) })}><SelectTrigger><SelectValue placeholder="All representatives" /></SelectTrigger><SelectContent><SelectItem value="all">All representatives</SelectItem>{owners.data?.map((owner) => <SelectItem key={owner.id} value={owner.id.toString()}>{owner.firstName} {owner.lastName}</SelectItem>)}</SelectContent></Select>}
            <Select value={filters.productGroupId?.toString() ?? "all"} onValueChange={(value) => updateFilters({ productGroupId: value === "all" ? undefined : Number(value) })}><SelectTrigger><SelectValue placeholder="All product groups" /></SelectTrigger><SelectContent><SelectItem value="all">All product groups</SelectItem>{products.data?.map((group) => <SelectItem key={group.id} value={group.id.toString()}>{group.name}</SelectItem>)}</SelectContent></Select>
            <Select value={filters.predictionStatus ?? "all"} onValueChange={(value) => updateFilters({ predictionStatus: value === "all" ? undefined : value as PredictionStatus })}><SelectTrigger><SelectValue placeholder="All prediction states" /></SelectTrigger><SelectContent><SelectItem value="all">All prediction states</SelectItem><SelectItem value="CURRENT">Current</SelectItem><SelectItem value="STALE">Stale</SelectItem><SelectItem value="UNSCORED">Not scored</SelectItem></SelectContent></Select>
            <Select value={filters.sort ?? "WEIGHTED_VALUE"} onValueChange={(value) => updateFilters({ sort: value as DecisionSupportFilters["sort"] })}><SelectTrigger><SelectValue placeholder="Sort opportunities" /></SelectTrigger><SelectContent><SelectItem value="WEIGHTED_VALUE">Highest weighted value</SelectItem><SelectItem value="PROBABILITY">Highest win probability</SelectItem><SelectItem value="VALUE">Highest opportunity value</SelectItem><SelectItem value="FOLLOW_UP">Follow-up urgency</SelectItem></SelectContent></Select>
          </CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Opportunity</TableHead>{data.scope.isAdmin && <TableHead>Sales representative</TableHead>}<TableHead>Estimated value</TableHead><TableHead>Win probability</TableHead><TableHead>Weighted value</TableHead><TableHead>Status</TableHead><TableHead>Follow-up</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
              <TableBody>{data.opportunities.length === 0 ? <TableRow><TableCell colSpan={data.scope.isAdmin ? 8 : 7} className="h-24 text-center text-muted-foreground">No open opportunities match these filters.</TableCell></TableRow> : data.opportunities.map((opportunity) => (
                <TableRow key={opportunity.id}>
                  <TableCell><p className="font-medium">{opportunity.title}</p><p className="text-xs text-muted-foreground">{opportunity.client.businessName}{opportunity.productGroup ? ` · ${opportunity.productGroup.name}` : ""}</p></TableCell>
                  {data.scope.isAdmin && <TableCell>{opportunity.owner.firstName} {opportunity.owner.lastName}</TableCell>}
                  <TableCell className="whitespace-nowrap">{money(opportunity.estimatedValueUsd)}</TableCell>
                  <TableCell>{opportunity.wonProbability === null ? "—" : `${(opportunity.wonProbability * 100).toFixed(1)}%`}</TableCell>
                  <TableCell className="whitespace-nowrap">{opportunity.weightedValueUsd === null ? <span className="text-muted-foreground">Needs scoring</span> : money(opportunity.weightedValueUsd)}</TableCell>
                  <TableCell><Badge variant="outline" className={statusClasses[opportunity.predictionStatus]}>{statusLabels[opportunity.predictionStatus]}</Badge>{opportunity.modelVariant && <p className="mt-1 text-xs text-muted-foreground">{opportunity.modelVariant === "PRIMARY" ? "Full-history model" : "Limited-history model"}</p>}</TableCell>
                  <TableCell>{opportunity.nextFollowUp ? <div><p className={opportunity.nextFollowUp.status === "OVERDUE" ? "font-medium text-destructive" : "font-medium"}>{opportunity.nextFollowUp.status === "OVERDUE" ? "Overdue" : "Upcoming"}</p><p className="whitespace-nowrap text-xs text-muted-foreground">{new Date(opportunity.nextFollowUp.dueAt).toLocaleDateString()}</p></div> : <span className="text-sm text-muted-foreground">No follow-up</span>}</TableCell>
                  <TableCell className="text-right"><Link className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline" to={`/dashboard/opportunities/${opportunity.id}`}>View <ExternalLink className="h-3.5 w-3.5" /></Link></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </div>
          <TablePagination page={data.pagination.page} pageSize={data.pagination.limit} totalPages={Math.max(1, data.pagination.totalPages)} totalCount={data.pagination.total} onPageChange={(page) => setFilters((current) => ({ ...current, page }))} onPageSizeChange={(limit) => setFilters((current) => ({ ...current, limit, page: 1 }))} />
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Prediction overview charts">
        <Card>
          <CardHeader><CardTitle className="text-base">Win probability distribution</CardTitle><CardDescription>Latest current predictions grouped into probability ranges</CardDescription></CardHeader>
          <CardContent>{data.summary.currentPredictions === 0 ? <p className="flex h-52 items-center justify-center text-sm text-muted-foreground">No current predictions to chart.</p> : <ChartContainer config={probabilityConfig} className="h-56 w-full"><BarChart accessibilityLayer data={data.charts.probabilityDistribution} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}><CartesianGrid vertical={false} /><XAxis dataKey="key" tickLine={false} axisLine={false} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="count" fill="var(--color-count)" radius={[5, 5, 0, 0]}><LabelList dataKey="count" position="top" /></Bar></BarChart></ChartContainer>}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Prediction coverage and model usage</CardTitle><CardDescription>One latest prediction state per authorized open opportunity</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">{coverageRows.map((item) => <div key={item.label}><div className="mb-1 flex justify-between text-sm"><span>{item.label}</span><span className="font-semibold tabular-nums">{item.value}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${item.className}`} style={{ width: `${(item.value / maxCoverage) * 100}%` }} /></div></div>)}</div>
            <div className="grid gap-3 border-t pt-4 sm:grid-cols-2"><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Full-history model</p><p className="mt-1 text-xl font-semibold">{data.charts.modelUsage.primary}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Limited-history model</p><p className="mt-1 text-xl font-semibold">{data.charts.modelUsage.limitedHistory}</p></div></div>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="monitoring-heading">
        <Card>
          <CardHeader><CardTitle id="monitoring-heading">Human feedback and prediction monitoring</CardTitle><CardDescription>Business judgment is shown separately from subsequent Won/Lost evidence.</CardDescription></CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <div><h3 className="mb-3 text-sm font-semibold">Human feedback</h3><div className="grid grid-cols-2 gap-3"><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Reasonable</p><p className="text-xl font-semibold">{data.reviews.REASONABLE}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Overestimated</p><p className="text-xl font-semibold">{data.reviews.OVERESTIMATED}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Underestimated</p><p className="text-xl font-semibold">{data.reviews.UNDERESTIMATED}</p></div><div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Unreviewed</p><p className="text-xl font-semibold">{data.reviews.unreviewed}</p></div></div><p className="mt-3 text-xs text-muted-foreground">{data.reviews.basis}. Feedback is subjective and is not an accuracy result.</p></div>
            <div><h3 className="mb-3 text-sm font-semibold">Outcome monitoring readiness</h3><Alert><BarChart3 className="h-4 w-4" /><AlertTitle>{data.outcomeMonitoring.eligiblePredictions} eligible pre-outcome predictions</AlertTitle><AlertDescription>{data.outcomeMonitoring.message}</AlertDescription></Alert><div className="mt-3 grid gap-2 sm:grid-cols-2">{data.outcomeMonitoring.byModelVariant.map((variant) => <div key={variant.variant} className="rounded-lg border p-3"><p className="text-xs font-medium">{variant.variant === "PRIMARY" ? "Full-history model" : "Limited-history model"}</p><p className="mt-1 text-sm text-muted-foreground">{variant.eligible} eligible · {variant.won} Won · {variant.lost} Lost</p></div>)}</div></div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
