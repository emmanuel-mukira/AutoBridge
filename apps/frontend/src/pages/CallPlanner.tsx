import { useState } from "react";
import { CalendarPlus, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FollowUpDialog } from "@/features/activities/components/ActivityDialogs";
import { FollowUpPlanner } from "@/features/activities/components/FollowUpPlanner";
import { useFollowUps } from "@/features/activities/hooks/useActivities";
import type { FollowUp } from "@/features/activities/services/activitiesApi";
import { useAuth } from "@/app/auth/useAuth";
import { useOpportunityOwners } from "@/features/opportunities/hooks/useOpportunities";

const allOwners = "all";

export default function CallPlanner() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FollowUp>();
  const [ownerId, setOwnerId] = useState("");
  const { user } = useAuth();
  const { data: owners } = useOpportunityOwners();
  const ownerFilter = ownerId ? { ownerId: Number(ownerId) } : {};
  const upcoming = useFollowUps({ completed: false, ...ownerFilter });
  const completed = useFollowUps({ completed: true, ...ownerFilter });
  const edit = (followUp: FollowUp) => { setEditing(followUp); setDialogOpen(true); };
  return <section className="space-y-5"><header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold">Follow-up planner</h1><p className="mt-1 text-sm text-muted-foreground">Plan and complete the next actions assigned to each client owner.</p></div><Button onClick={() => { setEditing(undefined); setDialogOpen(true); }}><CalendarPlus className="mr-2 h-4 w-4" />Schedule follow-up</Button></header>{user?.role === "ADMIN" && <Select value={ownerId || allOwners} onValueChange={(value) => setOwnerId(value === allOwners ? "" : value)}><SelectTrigger className="w-full sm:w-64" aria-label="Assigned owner"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={allOwners}>All assigned owners</SelectItem>{owners?.map((owner) => <SelectItem key={owner.id} value={String(owner.id)}>{owner.firstName} {owner.lastName}</SelectItem>)}</SelectContent></Select>}<Tabs defaultValue="upcoming"><TabsList><TabsTrigger value="upcoming"><Circle className="mr-2 h-4 w-4" />Upcoming ({upcoming.data?.pagination.total ?? 0})</TabsTrigger><TabsTrigger value="completed"><CheckCircle2 className="mr-2 h-4 w-4" />Completed ({completed.data?.pagination.total ?? 0})</TabsTrigger></TabsList><TabsContent value="upcoming" className="mt-5"><FollowUpPlanner followUps={upcoming.data?.followUps ?? []} isLoading={upcoming.isLoading} onEdit={edit} /></TabsContent><TabsContent value="completed" className="mt-5"><FollowUpPlanner followUps={completed.data?.followUps ?? []} isLoading={completed.isLoading} onEdit={edit} /></TabsContent></Tabs><FollowUpDialog open={dialogOpen} onOpenChange={setDialogOpen} followUp={editing} /></section>;
}
