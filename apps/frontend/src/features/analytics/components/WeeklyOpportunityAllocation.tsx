import { useEffect, useState } from "react";
import { Info } from "lucide-react";
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
import { weeklyAllocationApi, type PlannedFollowUp } from "../services/weeklyAllocationApi";

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

function FollowUpPreview({ items }: { items: PlannedFollowUp[] }) {
  return <ul className="space-y-2 text-sm">{items.slice(0, 2).map((item) =>
    <li key={item.id} className="min-w-0">
      <Link to={followUpLink(item.id)} className="block truncate font-medium text-primary hover:underline">{item.title}</Link>
      <span className="text-xs text-muted-foreground">{item.channel ?? "Other"} · {due(item.dueAt)} · {hours(item.effortMinutes)}</span>
    </li>)}</ul>;
}

export function WeeklyOpportunityAllocation() {
  const { user } = useAuth();
  const owners = useOpportunityOwners();
  const [selectedOwner, setSelectedOwner] = useState<number | null>(null);
  const ownerId = user?.role === "ADMIN" ? selectedOwner ?? undefined : undefined;
  const [weekStart, setWeekStart] = useState(() => mondayUtc());
  const [hoursInput, setHoursInput] = useState("");
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
    data.candidates.length === data.recommended.length;
  const money = (value: string) => formatMoney(Number(value), "USD", displayCurrency);
  const pendingPreview = data?.otherPending ?? [];

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
          <div className="mt-1 flex justify-between gap-2 text-xs text-muted-foreground"><span>{hours(data.completedMinutes)} of {data.availableMinutes == null ? "—" : hours(data.availableMinutes)} completed</span><span>{data.unusedMinutes == null ? "—" : hours(data.unusedMinutes)} remaining</span></div>
          <div className="grid grid-cols-2 gap-3 p-3 text-sm sm:grid-cols-4">
            {[
              ["Weekly hours", data.availableMinutes == null ? "Set hours" : hours(data.availableMinutes)],
              ["Completed hours", hours(data.completedMinutes)],
              ["Prioritized hours", hours(data.allocatedMinutes)],
              ["Remaining hours", data.unusedMinutes == null ? "—" : hours(data.unusedMinutes)],
            ].map(([label, value]) => <div key={label}><p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-semibold tabular-nums">{value}</p></div>)}
          </div>
        </section>
        {data.overbooked && <p role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">
          Completed work exceeds weekly hours by {hours(data.completedMinutes - data.availableMinutes!)}. No additional work is recommended.</p>}
        {data.availableMinutes !== null && data.pendingMinutes > data.remainingMinutes! && <p role="status" className="rounded-md border p-3 text-sm text-muted-foreground">Pending follow-ups total {hours(data.pendingMinutes)}, exceeding {hours(data.remainingMinutes!)} available for prioritization. Unselected work remains pending.</p>}
        <section className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">Recommended follow-ups ({data.recommended.length})</h3>
            {data.status === "READY" && <p className="text-xs text-muted-foreground">Selected weighted value {money(data.selectedExpectedValueUsd)}</p>}
          </div>
          {data.status === "CAPACITY_REQUIRED" ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Save your weekly selling hours to see recommendations.</p>
            : data.recommended.length === 0 ? <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No eligible follow-ups fit the remaining time.</p>
            : <div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground"><tr>
                <th className="px-3 py-2">#</th><th className="px-3 py-2">Opportunity and client</th>
                <th className="px-3 py-2">Follow-up and due date</th>
                <th className="px-3 py-2 text-right"><ColumnHelp label="Win" description="Current saved model estimate of the opportunity's chance of being won." /></th>
                <th className="px-3 py-2 text-right"><ColumnHelp label="Weighted value" description="Opportunity value multiplied by its saved win probability. The planner maximizes the combined weighted value within the time available." /></th>
                <th className="px-3 py-2 text-right"><ColumnHelp label="Time" description="Estimated effort for this follow-up." /></th>
                <th className="px-3 py-2"><ColumnHelp label="Action" description="Mark the follow-up complete. The weekly plan then recalculates from the remaining work." /></th>
              </tr></thead><tbody>{data.recommended.map((item, index) => <tr key={item.id} className="border-t">
                <td className="px-3 py-3 text-muted-foreground">{index + 1}</td>
                <td className="px-3 py-3"><Link to={opportunityLink(item.opportunityId)} className="font-medium text-primary hover:underline">{item.title}</Link>
                  <p className="text-xs text-muted-foreground">{item.clientName}</p></td>
                <td className="px-3 py-3"><Link to={followUpLink(item.id)} className="text-primary hover:underline">{item.channel ?? "Other"} follow-up</Link>
                  <p className="text-xs text-muted-foreground">{due(item.dueAt)} {item.attention === "OVERDUE" && "· Overdue"}</p></td>
                <td className="px-3 py-3 text-right tabular-nums">{(item.probability * 100).toFixed(1)}%</td>
                <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">{money(item.expectedValueUsd)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{hours(item.effortMinutes)}</td>
                <td className="px-3 py-3"><Button size="sm" variant="outline" disabled={complete.isPending}
                  onClick={() => complete.mutate(item.id)}>Complete</Button></td>
              </tr>)}</tbody></table></div>}
          <p className="text-xs text-muted-foreground">Knapsack selects the set; rows are then ordered by weighted value. Current predictions and completed follow-ups update the plan.</p>
        </section>
        <div className="grid gap-3 lg:grid-cols-3">
          <section className="flex h-full min-h-48 flex-col gap-3 rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-3"><h3 className="font-semibold">Pending Follow-ups</h3><span className="rounded-md bg-muted px-2 py-0.5 text-sm font-semibold tabular-nums">{pendingPreview.length}</span></div>
            {pendingPreview.length ? <FollowUpPreview items={pendingPreview} /> : <p className="text-sm text-muted-foreground">No follow-ups need attention.</p>}
            {data.excluded.length > 0 && <Link to={opportunityLink(data.excluded[0].id)} className="text-xs text-primary hover:underline">{data.excluded.length} opportunities need scoring or review</Link>}
            <Link to="/dashboard/follow-ups?from=decision-support" className="mt-auto text-sm font-medium text-primary hover:underline">Review pending work</Link>
          </section>
          <section className="flex h-full min-h-48 flex-col gap-3 rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-3"><h3 className="font-semibold">Unscheduled Opportunities</h3><span className="rounded-md bg-muted px-2 py-0.5 text-sm font-semibold tabular-nums">{data.withoutFollowUps.length}</span></div>
            {data.withoutFollowUps.length ? <ul className="space-y-2 text-sm">{data.withoutFollowUps.slice(0, 2).map((item) =>
              <li key={item.id}><Link to={opportunityLink(item.id)} className="block truncate font-medium text-primary hover:underline">{item.title}</Link><span className="text-xs text-muted-foreground">Open to schedule a follow-up</span></li>)}</ul>
              : <p className="text-sm text-muted-foreground">Every open opportunity has a pending next action.</p>}
            <Link to="/dashboard/opportunities" className="mt-auto text-sm font-medium text-primary hover:underline">View opportunities</Link>
          </section>
          <section className="flex h-full min-h-48 flex-col gap-3 rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-3"><h3 className="font-semibold">Algorithm Comparison</h3><span className="rounded-md bg-muted px-2 py-0.5 text-sm font-semibold tabular-nums">{data.comparisons.length}</span></div>
            {data.comparisons.length ? <div className="space-y-1.5 text-xs">{data.comparisons.map((row) =>
              <div key={row.method} className="grid gap-0.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-2">
                <span>{row.method === "KNAPSACK" ? "0/1 Knapsack" : row.method === "PROBABILITY" ? "Win probability" : row.method === "VALUE" ? "Opportunity value" : "Weighted value"}</span>
                <span className="tabular-nums text-muted-foreground sm:text-right">{row.count} · {hours(row.allocatedMinutes)} · {money(row.expectedValueUsd)}</span>
              </div>)}</div> : <p className="text-sm text-muted-foreground">Save weekly hours to compare methods.</p>}
            {allFit && <p className="text-xs text-muted-foreground">All eligible work fits; no allocation trade-off.</p>}
          </section>
        </div>
      </>}
    </CardContent>
  </Card></TooltipProvider>;
}
