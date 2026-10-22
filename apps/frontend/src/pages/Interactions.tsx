import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InteractionDialog } from "@/features/activities/components/ActivityDialogs";
import { InteractionTimeline } from "@/features/activities/components/InteractionTimeline";
import { InteractionTable } from "@/features/activities/components/InteractionTable";
import { useInteractions } from "@/features/activities/hooks/useActivities";
import type { Interaction, InteractionType } from "@/features/activities/services/activitiesApi";
import { useAuth } from "@/app/auth/useAuth";
import { useOpportunityOwners } from "@/features/opportunities/hooks/useOpportunities";

const all = "all";

export default function Interactions() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Interaction>();
  const [interactionType, setInteractionType] = useState<InteractionType | "">("");
  const [userId, setUserId] = useState("");
  const { user } = useAuth();
  const { data: owners } = useOpportunityOwners();
  const query = useInteractions({ ...(interactionType ? { interactionType } : {}), ...(userId ? { userId: Number(userId) } : {}) });
  const edit = (item: Interaction) => { setEditing(item); setDialogOpen(true); };
  const interactions = query.data?.interactions ?? [];
  return <section className="space-y-5"><header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold">Interactions</h1><p className="mt-1 text-sm text-muted-foreground">Track calls, emails, meetings and client visits.</p></div><Button onClick={() => { setEditing(undefined); setDialogOpen(true); }}><MessageSquarePlus className="mr-2 h-4 w-4" />Record interaction</Button></header><div className="flex flex-col gap-2 sm:flex-row"><Select value={interactionType || all} onValueChange={(value) => setInteractionType(value === all ? "" : value as InteractionType)}><SelectTrigger className="w-full sm:w-56" aria-label="Interaction type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={all}>All interaction types</SelectItem><SelectItem value="CALL">Calls</SelectItem><SelectItem value="EMAIL">Emails</SelectItem><SelectItem value="MEETING">Meetings</SelectItem><SelectItem value="SITE_VISIT">Site visits</SelectItem><SelectItem value="FOLLOW_UP">Other follow-ups</SelectItem></SelectContent></Select>{user?.role === "ADMIN" && <Select value={userId || all} onValueChange={(value) => setUserId(value === all ? "" : value)}><SelectTrigger className="w-full sm:w-56" aria-label="Recorded by"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={all}>All users</SelectItem>{owners?.map((owner) => <SelectItem key={owner.id} value={String(owner.id)}>{owner.firstName} {owner.lastName}</SelectItem>)}</SelectContent></Select>}</div>{query.error && <p role="alert" className="text-destructive">{query.error.message}</p>}<Tabs defaultValue="timeline"><TabsList><TabsTrigger value="timeline">Timeline</TabsTrigger><TabsTrigger value="table">Table</TabsTrigger></TabsList><TabsContent value="timeline" className="mt-5"><InteractionTimeline interactions={interactions} isLoading={query.isLoading} onEdit={edit} /></TabsContent><TabsContent value="table" className="mt-5"><InteractionTable interactions={interactions} isLoading={query.isLoading} onEdit={edit} /></TabsContent></Tabs><InteractionDialog open={dialogOpen} onOpenChange={setDialogOpen} interaction={editing} /></section>;
}
