import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useClient } from "@/features/clients/hooks/useClients";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientDialog } from "@/features/clients/components/ClientDialog";
import { ClientContactsDialog } from "@/features/clients/components/ClientContactsDialog";
import { Building2, MapPin, Pencil, Users } from "lucide-react";
import { ActivitySection } from "@/features/activities/components/ActivitySection";

export default function ClientDetails() {
  const [editOpen, setEditOpen] = useState(false);
  const [contactsOpen, setContactsOpen] = useState(false);
  const id = Number(useParams<{ id: string }>().id);
  const { data: client, isLoading, error } = useClient(id);
  return <section className="space-y-4">
    <Link className="text-primary hover:underline" to="/dashboard/clients">← Clients</Link>
    {isLoading && <p>Loading client...</p>}
    {error && <p role="alert" className="text-destructive">Client not found or access denied.</p>}
    {client && <>
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1"><CardTitle className="flex items-center gap-2 text-2xl"><Building2 className="h-6 w-6 text-primary" />{client.businessName}</CardTitle><p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{client.locationAddress}, {client.countyName}</p></div>
          <div className="flex flex-col gap-2 sm:flex-row"><Button variant="outline" onClick={() => setContactsOpen(true)}><Users className="mr-2 h-4 w-4" />Manage contacts ({client.contacts.length})</Button><Button onClick={() => setEditOpen(true)}><Pencil className="mr-2 h-4 w-4" />Edit client</Button></div>
        </CardHeader>
        <CardContent className="grid gap-4 border-t pt-6 sm:grid-cols-2">
          <div><p className="text-sm text-muted-foreground">Client owner</p><p className="font-medium">{client.owner ? `${client.owner.firstName} ${client.owner.lastName}` : "Unassigned"}</p></div>
          <div><p className="text-sm text-muted-foreground">Business history</p><p className="font-medium">{client.shortHistory || "No history recorded"}</p></div>
        </CardContent>
      </Card>
      <ActivitySection clientId={client.id} />
      <ClientDialog open={editOpen} onOpenChange={setEditOpen} client={client} />
      <ClientContactsDialog open={contactsOpen} onOpenChange={setContactsOpen} client={client} />
    </>}
  </section>;
}
