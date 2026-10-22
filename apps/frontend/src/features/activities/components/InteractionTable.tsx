import { format } from "date-fns";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Interaction } from "../services/activitiesApi";

const typeLabels = { CALL: "Call", EMAIL: "Email", MEETING: "Meeting", SITE_VISIT: "Site visit", FOLLOW_UP: "Follow-up" } as const;

export function InteractionTable({ interactions, isLoading, onEdit }: { interactions: Interaction[]; isLoading: boolean; onEdit: (interaction: Interaction) => void }) {
  if (isLoading) return <p className="py-8 text-center text-sm text-muted-foreground">Loading interactions...</p>;
  if (!interactions.length) return <p className="py-8 text-center text-sm text-muted-foreground">No interactions recorded yet.</p>;
  return <div className="rounded-lg border bg-card"><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Client</TableHead><TableHead>Opportunity</TableHead><TableHead>Recorded by</TableHead><TableHead className="w-16"><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader><TableBody>{interactions.map((interaction) => <TableRow key={interaction.id}><TableCell className="whitespace-nowrap">{format(new Date(interaction.occurredAt), "dd MMM yyyy, h:mm a")}</TableCell><TableCell><Badge variant="outline">{typeLabels[interaction.interactionType]}</Badge></TableCell><TableCell className="font-medium">{interaction.client.businessName}</TableCell><TableCell>{interaction.opportunity?.title ?? "—"}</TableCell><TableCell>{interaction.user.firstName} {interaction.user.lastName}</TableCell><TableCell><Button variant="ghost" size="icon" onClick={() => onEdit(interaction)} aria-label="Edit interaction"><Pencil className="h-4 w-4" /></Button></TableCell></TableRow>)}</TableBody></Table></div>;
}
