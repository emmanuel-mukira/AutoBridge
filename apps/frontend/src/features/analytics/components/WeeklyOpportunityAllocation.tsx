import { useEffect, useState } from "react";
import { ArrowUpRight, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/app/auth/useAuth";
import { useUIStore } from "@/app/store";
import { useOpportunityOwners } from "@/features/opportunities/hooks/useOpportunities";
import { useCompleteFollowUp } from "@/features/activities/hooks/useActivities";
import { formatMoney } from "@/lib/currency";
import { useListPagination } from "@/hooks/useListPagination";
import { TablePagination } from "@/components/shared/TablePagination";
import { weeklyAllocationApi } from "../services/weeklyAllocationApi";

function mondayUtc(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return start.toISOString().slice(0, 10);
}
const hours = (minutes: number) => (minutes / 60).toFixed(2) + " h";
const due = (value: string) => new Date(value).toLocaleString();
const followUpLink = (id: number) => "/dashboard/follow-ups?from=decision-support&followUpId=" + id;
const opportunityLink = (id: number) => "/dashboard/opportunities/" + id + "?from=decision-support";

function ColumnHelp({ label, description }: { label: string; description: string }) {
  return <Tooltip><span className="inline-flex items-center gap-1 whitespace-nowrap">{label}<TooltipTrigger asChild>
    <button type="button" aria-label={`About ${label}`} className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Info className="size-3.5" /></button>
  </TooltipTrigger></span><TooltipContent className="max-w-64 whitespace-normal text-left">{description}</TooltipContent></Tooltip>;
}

export function WeeklyOpportunityAllocation() {
  const { user } = useAuth();
  const owners = useOpportunityOwners();
  const [selectedOwner, setSelectedOwner] = useState<number | null>(null);
  const ownerId = user?.role === "ADMIN" ? selectedOwner ?? undefined : undefined;
  const [weekStart, setWeekStart] = useState(() => mondayUtc());
  const [hoursInput, setHoursInput] = useState("");
  const [followUpView, setFollowUpView] = useState<"recommended" | "overdue">("recommended");
  const queryClient = useQueryClient();
  const displayCurrency = useUIStore((state) => state.displayCurrency);
  const complete = useCompleteFollowUp();
  const queryKey = ["weekly-allocation", weekStart, ownerId];
  const plan = useQuery({
    queryKey,
    queryFn: () => weeklyAllocationApi.preview(weekStart, ownerId),
    enabled: user?.role !== "ADMIN" || ownerId !== undefined,
    refetchOnMount: "always",
  });
  useEffect(() => {
    setHoursInput(plan.data?.availableMinutes == null ? "" : String(plan.data.availableMinutes / 60));
  }, [plan.data?.availableMinutes, weekStart, ownerId]);
  const minutes = Number(hoursInput) * 60;
  const validHours = hoursInput.trim() !== "" && Number.isInteger(minutes) &&
    minutes >= 0 && minutes <= 4800 && minutes % 15 === 0;
  const save = useMutation({
    mutationFn: () => weeklyAllocationApi.saveCapacity(weekStart, minutes, ownerId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["weekly-allocation"] }),
  });
  const data = plan.data;
  const completedPercent = data?.availableMinutes
    ? Math.round((data.completedMinutes / data.availableMinutes) * 100)
    : 0;
  const allFit = data?.status === "READY" &&
    new Set(data.candidates.map((item) => item.opportunityId)).size === data.recommended.length;
  const money = (value: string) => formatMoney(Number(value), "USD", displayCurrency);
  const pendingPreview = data?.otherPending ?? [];
  const candidateById = new Map(data?.candidates.map((item) => [item.id, item]) ?? []);
  const selectedIds = new Set(data?.recommended.map((item) => item.id) ?? []);
  const scheduled = [...new Map([...pendingPreview, ...(data?.candidates ?? [])].map((item) => [item.id, item])).values()].sort((a, b) =>
    new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime() || a.id - b.id);
  const overdue = scheduled.filter((item) => new Date(item.dueAt) < new Date(data?.generatedAt ?? 0));
  const thisWeek = scheduled.filter((item) => new Date(item.dueAt) >= new Date(data?.generatedAt ?? 0))
    .sort((a, b) => Number(selectedIds.has(b.id)) - Number(selectedIds.has(a.id)) ||
      new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime() || a.id - b.id);
  const visibleFollowUps = followUpView === "recommended" ? thisWeek : overdue;
  const followUpPages = useListPagination(visibleFollowUps);

  return <TooltipProvider delayDuration={150}><Card className="overflow-hidden">
    <CardHeader className="border-b py-4">
      <CardTitle>Weekly follow-up priorities</CardTitle>
      <p className="text-sm text-muted-foreground">Plan existing sales actions using current saved win predictions. Recommendations do not change appointments or due dates.</p>
    </CardHeader>
    <CardContent className="space-y-4 pt-4">
      <div className="flex flex-wrap items-end gap-3">
        {user?.role === "ADMIN" && <label className="grid gap-1 text-sm font-medium">Sales representative
          <Select value={ownerId?.toString() ?? ""} onValueChange={(value) => setSelectedOwner(Number(value))}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Choose a representative" /></SelectTrigger>
            <SelectContent>{owners.data?.filter((owner) => owner.role === "SALES_REP").map((owner) =>
              <SelectItem key={owner.id} value={String(owner.id)}>{owner.firstName} {owner.lastName}</SelectItem>)}</SelectContent>
          </Select>
        </label>}
        <label className="grid gap-1 text-sm font-medium">Week beginning
          <Input type="date" value={weekStart} min={mondayUtc()} onChange={(event) =>
            event.target.value && setWeekStart(mondayUtc(new Date(event.target.value + "T12:00:00Z")))} className="w-44" />
        </label>
        <label className="grid gap-1 text-sm font-medium">Weekly selling hours
          <Input type="number" min="0" max="80" step="0.25" value={hoursInput}
            onChange={(event) => setHoursInput(event.target.value)} className="w-32" />
        </label>
        <Button disabled={!validHours || save.isPending || !data || minutes === data.availableMinutes}
          onClick={() => save.mutate()}>{save.isPending ? "Saving…" : "Save hours"}</Button>
      </div>
      <p className="text-xs text-muted-foreground">Weeks begin Monday in UTC. Duration estimates use 15-minute increments.</p>
      {hoursInput && !validHours && <p role="alert" className="text-sm text-destructive">Enter 0–80 hours in 15-minute increments.</p>}
      {(plan.error || save.error || complete.error) && <p role="alert" className="text-sm text-destructive">
        {plan.error?.message ?? save.error?.message ?? complete.error?.message}</p>}
      {plan.isLoading && <p className="text-sm text-muted-foreground">Loading weekly plan…</p>}
      {user?.role === "ADMIN" && !ownerId && <p className="text-sm text-muted-foreground">Choose a representative to view their plan.</p>}
      {data && <>
        <section aria-label="Weekly Sales Progress" className="rounded-lg border p-4">
          <div className="flex items-center justify-between gap-2 font-semibold"><h3>Weekly Sales Progress</h3><span className="tabular-nums">{completedPercent}% completed</span></div>
          <div role="progressbar" aria-label="Weekly work completed" aria-valuemin={0} aria-valuemax={100}
            aria-valuenow={Math.min(100, completedPercent)} className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-600 transition-[width] duration-500 motion-reduce:transition-none dark:bg-emerald-500" style={{ width: Math.min(100, completedPercent) + "%" }} /></div>
          <div className="mt-1 flex justify-between gap-2 text-xs text-muted-foreground"><span>{hours(data.completedMinutes)} of {data.availableMinutes == null ? "—" : hours(data.availableMinutes)} completed</span><span>{data.remainingMinutes == null ? "—" : hours(data.remainingMinutes)} remaining</span></div>
          <div className="grid grid-cols-2 gap-3 p-3 text-sm sm:grid-cols-4">
            {[
              ["Weekly hours", data.availableMinutes == null ? "Set hours" : hours(data.availableMinutes)],
              ["Completed hours", hours(data.completedMinutes)],
              ["Prioritized hours", hours(data.allocatedMinutes)],
              ["Remaining hours", data.remainingMinutes == null ? "—" : hours(data.remainingMinutes)],
            ].map(([label, value]) => <div key={label}><p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-semibold tabular-nums">{value}</p></div>)}
          </div>
        </section>
        {data.overbooked && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">
          Completed work exceeds weekly hours by {hours(data.completedMinutes - data.availableMinutes!)}. No additional work is recommended.</p>}
        {data.availableMinutes !== null && data.pendingMinutes > data.remainingMinutes! && <p role="status" className="rounded-md border p-3 text-sm text-muted-foreground">Pending follow-ups total {hours(data.pendingMinutes)}, exceeding {hours(data.remainingMinutes!)} available for prioritization. Unselected work remains pending.</p>}
        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3"><h3 className="font-semibold">Weekly follow-ups</h3>
              <div className="inline-flex rounded-lg bg-muted p-1 text-sm"><button type="button" aria-pressed={followUpView === "recommended"} onClick={() => { setFollowUpView("recommended"); followUpPages.pagination.onPageChange(1); }} className={`min-h-10 rounded-md px-4 py-2 ${followUpView === "recommended" ? "bg-background font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>This week ({thisWeek.length})</button><button type="button" aria-pressed={followUpView === "overdue"} onClick={() => { setFollowUpView("overdue"); followUpPages.pagination.onPageChange(1); }} className={`min-h-10 rounded-md px-4 py-2 ${followUpView === "overdue" ? "bg-background font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>Overdue ({overdue.length})</button></div></div>
            {data.status === "READY" && <p className="text-xs text-muted-foreground">Selected weighted value {money(data.selectedExpectedValueUsd)}</p>}
          </div>
          {followUpView === "recommended" && <p className="text-xs text-muted-foreground">{data.recommended.length} prioritized within {data.remainingMinutes === null ? "hours not set" : hours(data.remainingMinutes) + " available"}. Other due follow-ups remain visible below.</p>}
          {visibleFollowUps.length === 0 ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">{followUpView === "recommended" ? "No pending follow-ups due later this week." : "No overdue follow-ups."}</p>
            : <div className="overflow-hidden rounded-md border"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground"><tr>
                <th className="px-3 py-2">#</th><th className="px-3 py-2">Opportunity and client</th>
                <th className="px-3 py-2">Follow-up and due date</th>
                <th className="px-3 py-2 text-right"><ColumnHelp label="Win" description="Current saved model estimate of the opportunity's chance of being won." /></th>
                <th className="px-3 py-2 text-right"><ColumnHelp label="Weighted value" description="Opportunity value multiplied by its saved win probability. The planner maximizes the combined weighted value within the time available." /></th>
                <th className="px-3 py-2 text-right"><ColumnHelp label="Time" description="Estimated effort for this follow-up." /></th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2"><ColumnHelp label="Action" description="Mark the follow-up complete. The weekly plan then recalculates from the remaining work." /></th>
              </tr></thead><tbody>{followUpPages.visibleItems.map((item, index) => { const candidate = candidateById.get(item.id); const reason = data.excluded.find((entry) => entry.id === item.opportunityId)?.reason; return <tr key={item.id} className="border-t">
                <td className="px-3 py-3 text-muted-foreground">{(followUpPages.pagination.page - 1) * followUpPages.pagination.pageSize + index + 1}</td>
                <td className="px-3 py-3">{item.opportunityId ? <Link to={opportunityLink(item.opportunityId)} className="font-medium text-primary hover:underline">{candidate?.title ?? ("opportunityTitle" in item ? item.opportunityTitle : null) ?? item.title}</Link> : <span>{item.title}</span>}
                  <p className="text-xs text-muted-foreground">{item.clientName}</p></td>
                <td className="px-3 py-3"><Link to={followUpLink(item.id)} className="text-primary hover:underline">{candidate ? `${item.channel ?? "Other"} follow-up` : item.title}</Link>
                  <p className="text-xs text-muted-foreground">{due(item.dueAt)} {new Date(item.dueAt) < new Date(data.generatedAt) && "· Overdue"}</p></td>
                <td className="px-3 py-3 text-right tabular-nums">{candidate ? `${(candidate.probability * 100).toFixed(1)}%` : "—"}</td>
                <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">{candidate ? money(candidate.expectedValueUsd) : "—"}</td>
                <td className="px-3 py-3 text-right tabular-nums">{hours(item.effortMinutes)}</td>
                <td className="px-3 py-3 text-xs">{followUpView === "overdue" ? "Overdue" : selectedIds.has(item.id) ? "Prioritized" : candidate ? data.remainingMinutes === null ? "Set weekly hours" : candidate.effortMinutes > data.remainingMinutes ? "Exceeds available hours" : data.recommended.some((entry) => entry.opportunityId === item.opportunityId) ? "Another action prioritized" : "Not prioritized" : reason ?? "Needs review"}</td>
                <td className="px-3 py-3"><Button size="sm" variant="outline" disabled={complete.isPending}
                  onClick={() => complete.mutate(item.id)}>Complete</Button></td>
              </tr>; })}</tbody></table></div><TablePagination {...followUpPages.pagination} /></div>}
          <p className="text-xs text-muted-foreground">Prioritized actions appear first. Other due work stays visible and pending; overdue work has its own tab.</p>
          <div className="flex flex-wrap items-center gap-3"><Button size="sm" variant="outline" asChild><Link to="/dashboard/follow-ups?from=decision-support">View pending follow-ups <ArrowUpRight className="ml-1 size-4" aria-hidden="true" /></Link></Button>
            {data.excluded.length > 0 && <Link to={opportunityLink(data.excluded[0].id)} className="text-primary hover:underline">{data.excluded.length} opportunities need scoring or review</Link>}</div>
        </section>
        <div className="grid gap-3 lg:grid-cols-2">
          <section className="flex h-full min-h-48 flex-col rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">Unscheduled opportunities</h3><p className="mt-1 text-xs text-muted-foreground">Open opportunities with no pending next action.</p></div><span className="rounded-md bg-muted px-2 py-0.5 text-sm font-semibold tabular-nums">{data.withoutFollowUps.length}</span></div>
            {data.withoutFollowUps.length ? <ul className="mt-3 divide-y rounded-md border text-sm">{data.withoutFollowUps.slice(0, 4).map((item) =>
              <li key={item.id}><Link to={opportunityLink(item.id)} className="flex min-h-11 items-center justify-between gap-3 px-3 py-2 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><span className="min-w-0 truncate font-medium">{item.title}</span><ArrowUpRight className="size-4 shrink-0 text-primary" aria-hidden="true" /><span className="sr-only">Open opportunity to schedule a follow-up</span></Link></li>)}</ul>
              : <p className="mt-3 rounded-md border border-dashed p-4 text-sm text-muted-foreground">Every open opportunity has a pending next action.</p>}
            <Button size="sm" variant="outline" asChild className="mt-3 self-start"><Link to="/dashboard/opportunities">View opportunities <ArrowUpRight className="ml-1 size-4" aria-hidden="true" /></Link></Button>
          </section>
          <section className="flex h-full min-h-48 flex-col gap-3 rounded-lg border bg-card p-4">
            <div><h3 className="font-semibold">Algorithm comparison</h3><p className="mt-1 text-xs text-muted-foreground">Share of the best weighted value using the same follow-ups and hours.</p></div>
            {data.comparisons.length ? <div className="space-y-2 text-xs">{data.comparisons.map((row) => {
              const best = Number(data.selectedExpectedValueUsd);
              const value = Number(row.expectedValueUsd);
              const gap = Math.max(0, best - value);
              const share = best > 0 ? Math.min(100, (value / best) * 100) : 0;
              return <div key={row.method} className={`rounded-md border px-3 py-2 ${row.method === "KNAPSACK" ? "border-primary/40 bg-primary/5" : ""}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3"><span className="font-medium text-foreground">{row.method === "KNAPSACK" ? "0/1 Knapsack" : row.method === "PROBABILITY" ? "Win probability" : row.method === "VALUE" ? "Opportunity value" : "Weighted value"}</span><span className="font-semibold tabular-nums text-foreground">{best > 0 ? `${share.toFixed(1)}%` : "—"}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} /></div>
                <div className="mt-1 flex flex-wrap justify-between gap-x-3 text-muted-foreground"><span>{row.count} actions · {hours(row.allocatedMinutes)}</span><span>{money(row.expectedValueUsd)}{gap > 0.005 ? ` · ${money(gap.toFixed(2))} below best` : best > 0 && row.method !== "KNAPSACK" ? " · tied best" : ""}</span></div>
              </div>;
            })}</div> : <p className="text-sm text-muted-foreground">Save weekly hours to compare methods.</p>}
            {allFit && data.candidates.length > 0 && <p className="text-xs text-muted-foreground">At least one action from every eligible opportunity fits; methods may tie.</p>}
            <details className="mt-auto rounded-md border bg-muted/30 text-xs"><summary className="cursor-pointer px-3 py-2 font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">How is the plan chosen?</summary>
              <div className="space-y-2 border-t px-3 py-3 text-muted-foreground"><p><strong className="text-foreground">Planning value</strong> = opportunity value × saved win probability. This is an estimate, not a sales result.</p>
                <p><strong className="text-foreground">Knapsack</strong> finds the highest combined planning value that fits the hours left after completed work. It takes each action whole, with at most one action per opportunity. Longer actions get no bonus.</p>
                <p><strong className="text-foreground">Comparison methods</strong> take actions in order of probability, opportunity value, or weighted value. “Below best” is the value they miss against knapsack; a tie is a valid result. Overdue actions stay in their own tab.</p></div>
            </details>
          </section>
        </div>
      </>}
    </CardContent>
  </Card></TooltipProvider>;
}
