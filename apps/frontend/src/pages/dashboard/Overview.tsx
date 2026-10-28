import { useState } from "react";
import { Link } from "react-router-dom";
import { Activity, AlertCircle, BriefcaseBusiness, CalendarCheck, CalendarClock, CircleDollarSign, Clock3, Target, Trophy } from "lucide-react";
import { useAuth } from "@/app/auth/useAuth";
import { useUIStore } from "@/app/store";
import { StatusDistributionChart } from "@/components/dashboard/charts/StatusDistributionChart";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AnalyticsHeader } from "@/features/analytics/components/AnalyticsHeader";
import { MetricCard } from "@/features/analytics/components/MetricCard";
import { useAnalytics } from "@/features/analytics/hooks/useAnalytics";
import type { AnalyticsFilters, AnalyticsOpportunity } from "@/features/analytics/types";
import { useOpportunityOwners, useOpportunityProducts } from "@/features/opportunities/hooks/useOpportunities";
import type { OpportunityStage } from "@/features/opportunities/services/opportunitiesApi";
import { opportunityStageClass, opportunityStageLabels, salesRouteLabels } from "@/features/opportunities/utils/labels";
import { formatMoney } from "@/lib/currency";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const stages: OpportunityStage[] = ["NEW", "QUALIFYING", "PROPOSAL", "NEGOTIATION", "CLOSED"];
const performanceConfig = {
  won: { label: "Won", color: "hsl(var(--chart-2))" },
  lost: { label: "Lost", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig;

function WinRateBreakdown({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: { key: string | number; label: string; won: number; lost: number; resolved: number; winRate: number | null }[];
}) {
  return (
    <Card className="h-full">
      <CardHeader><CardTitle className="text-base">{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
      <CardContent>
        {rows.filter((row) => row.resolved > 0).length === 0 ? <p className="text-sm text-muted-foreground">No completed sales outcomes in this period.</p> : <>
          <ChartContainer config={performanceConfig} className="w-full" style={{ height: Math.min(240, Math.max(130, rows.filter((row) => row.resolved > 0).length * 44)) }}>
            <BarChart accessibilityLayer data={rows.filter((row) => row.resolved > 0).map((row) => ({ ...row, rateLabel: `${row.winRate}% (${row.resolved})` }))} layout="vertical" margin={{ left: 0, right: 64 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" allowDecimals={false} hide />
              <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} width={115} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="won" stackId="outcomes" fill="var(--color-won)" radius={[4, 0, 0, 4]} />
              <Bar dataKey="lost" stackId="outcomes" fill="var(--color-lost)" radius={[0, 4, 4, 0]}><LabelList dataKey="rateLabel" position="right" className="fill-foreground text-[10px]" /></Bar>
            </BarChart>
          </ChartContainer>
          <p className="mt-2 text-xs text-muted-foreground">Bars show Won and Lost counts. Labels show win rate and completed opportunities (Won + Lost).</p>
        </>}
        {rows.filter((row) => row.resolved === 0).map((row) => <p key={row.key} className="mt-2 text-xs text-muted-foreground">{row.label}: No completed sales outcomes</p>)}
      </CardContent>
    </Card>
  );
}

function OpportunityTable({ title, description, opportunities }: { title: string; description: string; opportunities: AnalyticsOpportunity[] }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {opportunities.length === 0 ? <p className="px-6 pb-6 text-sm text-muted-foreground">No matching opportunities.</p> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Opportunity</TableHead><TableHead>Client</TableHead><TableHead>Stage</TableHead><TableHead>Owner</TableHead></TableRow></TableHeader>
              <TableBody>{opportunities.map((opportunity) => (
                <TableRow key={opportunity.id}>
                  <TableCell><Link className="font-medium text-primary hover:underline" to={`/dashboard/opportunities/${opportunity.id}`}>{opportunity.title}</Link></TableCell>
                  <TableCell>{opportunity.client.businessName}</TableCell>
                  <TableCell><Badge variant="outline" className={opportunityStageClass[opportunity.stage]}>{opportunityStageLabels[opportunity.stage]}</Badge></TableCell>
                  <TableCell>{opportunity.owner.firstName} {opportunity.owner.lastName}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Overview() {
  const { user } = useAuth();
  const displayCurrency = useUIStore((state) => state.displayCurrency);
  const [filters, setFilters] = useState<AnalyticsFilters>({});
  const analytics = useAnalytics(filters);
  const owners = useOpportunityOwners();
  const products = useOpportunityProducts();
  const data = analytics.data;

  if (analytics.isLoading) return <div className="space-y-5"><Skeleton className="h-20 w-full" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-32" />)}</div><Skeleton className="h-96" /></div>;
  if (analytics.isError || !data) return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Dashboard unavailable</AlertTitle><AlertDescription>{analytics.error instanceof Error ? analytics.error.message : "Unable to load operational analytics."}</AlertDescription></Alert>;

  const pipelineValue = formatMoney(Number(data.summary.openPipelineValueUsd), "USD", displayCurrency, Number(data.currencyBasis.kesPerUsd));
  return (
    <div className="space-y-6 pb-8">
      <AnalyticsHeader isAdmin={data.scope.isAdmin} lastUpdated={new Date(analytics.dataUpdatedAt)} />

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {user?.role === "ADMIN" && <Select value={filters.ownerId?.toString() ?? "all"} onValueChange={(value) => setFilters((current) => ({ ...current, ownerId: value === "all" ? undefined : Number(value) }))}><SelectTrigger><SelectValue placeholder="All representatives" /></SelectTrigger><SelectContent><SelectItem value="all">All representatives</SelectItem>{owners.data?.map((owner) => <SelectItem key={owner.id} value={owner.id.toString()}>{owner.firstName} {owner.lastName}</SelectItem>)}</SelectContent></Select>}
          <Select value={filters.stage ?? "all"} onValueChange={(value) => setFilters((current) => ({ ...current, stage: value === "all" ? undefined : value as OpportunityStage }))}><SelectTrigger><SelectValue placeholder="All stages" /></SelectTrigger><SelectContent><SelectItem value="all">All stages</SelectItem>{stages.map((stage) => <SelectItem key={stage} value={stage}>{opportunityStageLabels[stage]}</SelectItem>)}</SelectContent></Select>
          <Select value={filters.outcome ?? "all"} onValueChange={(value) => setFilters((current) => ({ ...current, outcome: value === "all" ? undefined : value as "WON" | "LOST" }))}><SelectTrigger><SelectValue placeholder="All outcomes" /></SelectTrigger><SelectContent><SelectItem value="all">All outcomes</SelectItem><SelectItem value="WON">Won</SelectItem><SelectItem value="LOST">Lost</SelectItem></SelectContent></Select>
          <Select value={filters.productGroupId?.toString() ?? "all"} onValueChange={(value) => setFilters((current) => ({ ...current, productGroupId: value === "all" ? undefined : Number(value) }))}><SelectTrigger><SelectValue placeholder="All product groups" /></SelectTrigger><SelectContent><SelectItem value="all">All product groups</SelectItem>{products.data?.map((group) => <SelectItem key={group.id} value={group.id.toString()}>{group.name}</SelectItem>)}</SelectContent></Select>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <MetricCard title="Open pipeline value" value={pipelineValue} description="Current authorized open pipeline" icon={CircleDollarSign} />
        <MetricCard title="Total opportunities" value={data.summary.totalOpportunities} description="Created in the selected period" icon={BriefcaseBusiness} />
        <MetricCard title="Open opportunities" value={data.summary.openOpportunities} description="Current open pipeline" icon={Target} />
        <MetricCard title="Won opportunities" value={data.summary.wonOpportunities} description="Outcome recorded in selected period" icon={Trophy} />
        <MetricCard title="Opportunity win rate" value={data.summary.winRate === null ? "No resolved data" : `${data.summary.winRate}%`} description="Outcomes in period: Won ÷ (Won + Lost)" icon={CircleDollarSign} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StatusDistributionChart title="Opportunity outcome summary" description="Current open pipeline plus Won and Lost outcomes recorded in the selected period" data={data.distributions.byOutcome.filter((item) => item.count > 0).map((item) => ({ status: item.key, count: item.count }))} />
        <WinRateBreakdown title="Product group performance" description="Resolved win rate by automotive product group" rows={data.distributions.byProductGroup.map((item) => ({ ...item, key: item.id ?? "unspecified" }))} />
      </div>

      <div className={`grid gap-4 ${data.scope.isAdmin ? "xl:grid-cols-2" : ""}`}>
        {data.scope.isAdmin && <Card className="overflow-hidden">
          <CardHeader><CardTitle className="text-base">Sales representative performance</CardTitle><CardDescription>Resolved outcomes and confirmed Won value in the selected period</CardDescription></CardHeader>
          <CardContent className="p-0">{data.distributions.byOwner.length === 0 ? <p className="px-6 pb-6 text-sm text-muted-foreground">No representative outcomes in this period.</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Representative</TableHead><TableHead>Won</TableHead><TableHead>Lost</TableHead><TableHead>Win rate</TableHead><TableHead>Confirmed Won value</TableHead></TableRow></TableHeader><TableBody>{data.distributions.byOwner.map((owner) => <TableRow key={owner.id}><TableCell className="font-medium">{owner.label}</TableCell><TableCell>{owner.won}</TableCell><TableCell>{owner.lost}</TableCell><TableCell>{owner.winRate === null ? "—" : `${owner.winRate}%`} <span className="text-xs text-muted-foreground">({owner.resolved})</span></TableCell><TableCell>{formatMoney(Number(owner.confirmedWonValueUsd), "USD", displayCurrency, Number(data.currencyBasis.kesPerUsd))}</TableCell></TableRow>)}</TableBody></Table></div>}</CardContent>
        </Card>}
        <WinRateBreakdown title="Route-to-market performance" description="Resolved win rate by recorded sales channel" rows={data.distributions.byRoute.map((item) => ({ ...item, label: item.key === "UNSPECIFIED" ? "Unspecified" : salesRouteLabels[item.key as keyof typeof salesRouteLabels] }))} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Interactions recorded" value={data.activities.interactionsRecorded} description="Occurred in the selected period" icon={Activity} />
        <MetricCard title="Upcoming follow-ups" value={data.activities.upcomingFollowUps} description="Incomplete and due before period end" icon={CalendarClock} />
        <MetricCard title="Overdue follow-ups" value={data.activities.overdueFollowUps} description="Incomplete and past due" icon={Clock3} />
        <MetricCard title="Completed follow-ups" value={data.activities.completedFollowUps} description="Completed in the selected period" icon={CalendarCheck} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <OpportunityTable title="Recently created opportunities" description="Newest records in the current reporting scope" opportunities={data.recentOpportunities} />
        <OpportunityTable title="Follow-up attention" description="Open opportunities without an incomplete future follow-up" opportunities={data.attentionOpportunities} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent interactions</CardTitle><CardDescription>Latest recorded client activity in the reporting scope</CardDescription></CardHeader>
        <CardContent>{data.recentInteractions.length === 0 ? <p className="text-sm text-muted-foreground">No interactions recorded in this period.</p> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.recentInteractions.map((interaction) => <div key={interaction.id} className="rounded-lg border p-4"><div className="mb-2 flex items-center justify-between gap-2"><Badge variant="secondary">{interaction.interactionType.replace("_", " ")}</Badge><span className="text-xs text-muted-foreground">{new Date(interaction.occurredAt).toLocaleDateString()}</span></div><p className="font-medium">{interaction.client.businessName}</p><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{interaction.notes || "No notes recorded"}</p><p className="mt-3 text-xs text-muted-foreground">{interaction.user.firstName} {interaction.user.lastName}</p></div>)}</div>}</CardContent>
      </Card>
    </div>
  );
}
