import { useState } from "react";
import { format } from "date-fns";
import type { LucideIcon } from "lucide-react";
import { Edit, Mail, MapPin, MessageCircle, Phone, Trash2, Users } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useDeleteInteraction } from "../hooks/useActivities";
import type { Interaction, InteractionType } from "../services/activitiesApi";

const config: Record<InteractionType, { label: string; icon: LucideIcon; color: string }> = {
  CALL: { label: "Call", icon: Phone, color: "text-blue-600 dark:text-blue-400" },
  EMAIL: { label: "Email", icon: Mail, color: "text-purple-600 dark:text-purple-400" },
  MEETING: { label: "Meeting", icon: Users, color: "text-green-600 dark:text-green-400" },
  SITE_VISIT: { label: "Site visit", icon: MapPin, color: "text-orange-600 dark:text-orange-400" },
  FOLLOW_UP: { label: "Follow-up", icon: MessageCircle, color: "text-amber-600 dark:text-amber-400" },
};

export function InteractionTimeline({ interactions, isLoading, onEdit, compact = false }: { interactions: Interaction[]; isLoading: boolean; onEdit: (interaction: Interaction) => void; compact?: boolean }) {
  const remove = useDeleteInteraction();
  const [deleteId, setDeleteId] = useState<number>();
  if (isLoading) return <p className="py-8 text-center text-sm text-muted-foreground">Loading interactions...</p>;
  if (!interactions.length) return <p className="py-8 text-center text-sm text-muted-foreground">No interactions recorded yet.</p>;
  const grouped = interactions.reduce<Record<string, Interaction[]>>((result, interaction) => {
    const date = format(new Date(interaction.occurredAt), "dd MMM yyyy");
    (result[date] ??= []).push(interaction);
    return result;
  }, {});
  return <div className="space-y-6">
    {Object.entries(grouped).map(([date, items]) => <section key={date}>
      <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">{date}</h3>
      <div className="space-y-3">{items?.map((interaction) => {
        const item = config[interaction.interactionType]; const Icon = item.icon;
        return <article key={interaction.id} className="flex gap-3 rounded-lg border bg-card p-4">
          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background ${item.color}`}><Icon className="h-4 w-4" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{item.label} · {interaction.client.businessName}</p><p className="text-xs text-muted-foreground">{format(new Date(interaction.occurredAt), "h:mm a")} by {interaction.user.firstName} {interaction.user.lastName}</p></div><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => onEdit(interaction)} aria-label="Edit interaction"><Edit className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(interaction.id)} aria-label="Delete interaction"><Trash2 className="h-4 w-4" /></Button></div></div>
            {interaction.opportunity && <p className="mt-2 text-sm text-primary">Opportunity: {interaction.opportunity.title}</p>}
            {interaction.notes && <p className={`mt-2 whitespace-pre-wrap text-sm ${compact ? "line-clamp-3" : ""}`}>{interaction.notes}</p>}
          </div>
        </article>;
      })}</div>
    </section>)}
    <AlertDialog open={deleteId !== undefined} onOpenChange={(open) => !open && setDeleteId(undefined)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete interaction?</AlertDialogTitle><AlertDialogDescription>This permanently removes the activity record.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteId) remove.mutate(deleteId); setDeleteId(undefined); }}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}
