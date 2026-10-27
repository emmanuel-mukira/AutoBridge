import { addDays, format, isBefore, startOfDay, startOfWeek } from "date-fns";
import { CalendarDays, CheckCircle2, Clock3, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCompleteFollowUp } from "../hooks/useActivities";
import type { FollowUp } from "../services/activitiesApi";

const channelLabels = { CALL: "Call", EMAIL: "Email", MEETING: "Meeting", SITE_VISIT: "Site visit", FOLLOW_UP: "Other" } as const;

export function FollowUpPlanner({ followUps, isLoading, onEdit }: { followUps: FollowUp[]; isLoading: boolean; onEdit: (followUp: FollowUp) => void }) {
  const complete = useCompleteFollowUp();
  if (isLoading) return <p className="py-8 text-center text-sm text-muted-foreground">Loading follow-ups...</p>;
  if (!followUps.length) return <p className="py-8 text-center text-sm text-muted-foreground">No follow-ups found.</p>;
  const weeks = followUps.reduce<Record<string, FollowUp[]>>((result, item) => {
    const week = format(startOfWeek(new Date(item.dueAt), { weekStartsOn: 1 }), "yyyy-MM-dd");
    (result[week] ??= []).push(item);
    return result;
  }, {});
  return <div className="space-y-8">{Object.entries(weeks).sort(([a], [b]) => a.localeCompare(b)).map(([week, items]) => {
    const start = new Date(`${week}T12:00:00`);
    return <section key={week} className="space-y-4"><header className="flex items-center gap-3 border-b pb-2"><CalendarDays className="h-5 w-5 text-primary" /><div><h2 className="font-semibold">Week of {format(start, "dd MMM yyyy")}</h2><p className="text-xs text-muted-foreground">{format(start, "dd MMM")} – {format(addDays(start, 6), "dd MMM yyyy")}</p></div><Badge variant="outline" className="ml-auto">{items?.length ?? 0}</Badge></header>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{items?.map((followUp) => {
        const overdue = !followUp.completedAt && isBefore(new Date(followUp.dueAt), startOfDay(new Date()));
        return <Card key={followUp.id} className={followUp.completedAt ? "opacity-65" : ""}><CardContent className="space-y-3 p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="break-words font-semibold">{followUp.title}</p><p className="text-sm text-muted-foreground">{followUp.client.businessName}</p></div>{followUp.completedAt ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" /> : <Clock3 className="h-5 w-5 shrink-0 text-amber-600" />}</div><div className="flex flex-wrap gap-2">{followUp.channel && <Badge variant="secondary">{channelLabels[followUp.channel]}</Badge>}{followUp.opportunity && <Badge variant="outline" className="max-w-full truncate">{followUp.opportunity.title}</Badge>}</div><div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span>{format(new Date(followUp.dueAt), "EEE, dd MMM · h:mm a")}</span>{overdue && <Badge variant="destructive">Overdue</Badge>}</div><p className="text-xs text-muted-foreground">Owner: {followUp.owner.firstName} {followUp.owner.lastName}</p><div className="grid grid-cols-2 gap-2 border-t pt-3"><Button variant="outline" size="sm" className="min-w-0 px-2" onClick={() => onEdit(followUp)}><Edit className="mr-1 h-4 w-4 shrink-0" /><span className="truncate">Reschedule</span></Button>{!followUp.completedAt && <Button size="sm" className="min-w-0 px-2" disabled={complete.isPending} onClick={() => complete.mutate(followUp.id)}><CheckCircle2 className="mr-1 h-4 w-4 shrink-0" /><span className="truncate">Complete</span></Button>}</div></CardContent></Card>;
      })}</div>
    </section>;
  })}</div>;
}
