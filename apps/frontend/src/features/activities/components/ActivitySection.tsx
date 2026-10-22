import { useState } from "react";
import { CalendarPlus, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFollowUps, useInteractions } from "../hooks/useActivities";
import type { FollowUp, Interaction } from "../services/activitiesApi";
import { FollowUpDialog, InteractionDialog } from "./ActivityDialogs";
import { FollowUpPlanner } from "./FollowUpPlanner";
import { InteractionTimeline } from "./InteractionTimeline";

export function ActivitySection({ clientId, opportunityId }: { clientId: number; opportunityId?: number }) {
  const filters = { clientId, ...(opportunityId ? { opportunityId } : {}) };
  const interactions = useInteractions(filters);
  const followUps = useFollowUps(filters);
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [editingInteraction, setEditingInteraction] = useState<Interaction>();
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp>();
  return <Card><CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between"><CardTitle>Sales activity</CardTitle><div className="flex flex-col gap-2 sm:flex-row"><Button variant="outline" onClick={() => { setEditingInteraction(undefined); setInteractionOpen(true); }}><MessageSquarePlus className="mr-2 h-4 w-4" />Record interaction</Button><Button onClick={() => { setEditingFollowUp(undefined); setFollowUpOpen(true); }}><CalendarPlus className="mr-2 h-4 w-4" />Schedule follow-up</Button></div></CardHeader><CardContent><Tabs defaultValue="interactions"><TabsList><TabsTrigger value="interactions">Interactions ({interactions.data?.pagination.total ?? 0})</TabsTrigger><TabsTrigger value="follow-ups">Follow-ups ({followUps.data?.pagination.total ?? 0})</TabsTrigger></TabsList><TabsContent value="interactions" className="mt-4"><InteractionTimeline interactions={interactions.data?.interactions ?? []} isLoading={interactions.isLoading} compact onEdit={(item) => { setEditingInteraction(item); setInteractionOpen(true); }} /></TabsContent><TabsContent value="follow-ups" className="mt-4"><FollowUpPlanner followUps={followUps.data?.followUps ?? []} isLoading={followUps.isLoading} onEdit={(item) => { setEditingFollowUp(item); setFollowUpOpen(true); }} /></TabsContent></Tabs></CardContent><InteractionDialog open={interactionOpen} onOpenChange={setInteractionOpen} interaction={editingInteraction} clientId={clientId} opportunityId={opportunityId} /><FollowUpDialog open={followUpOpen} onOpenChange={setFollowUpOpen} followUp={editingFollowUp} clientId={clientId} opportunityId={opportunityId} /></Card>;
}
