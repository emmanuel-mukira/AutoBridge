import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAccount } from "@/features/customers/hooks/useAccounts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountDialog } from "@/features/customers/components/AccountDialog";
import { AccountContactsDialog } from "@/features/customers/components/AccountContactsDialog";
import { Building2, MapPin, Pencil, Users } from "lucide-react";

export default function AccountDetails() {
  const [editOpen, setEditOpen] = useState(false);
  const [contactsOpen, setContactsOpen] = useState(false);
  const id = Number(useParams<{ id: string }>().id);
  const { data: account, isLoading, error } = useAccount(id);
  return <section className="space-y-4">
    <Link className="text-primary hover:underline" to="/dashboard/accounts">← Accounts</Link>
    {isLoading && <p>Loading account...</p>}
    {error && <p role="alert" className="text-destructive">Account not found or access denied.</p>}
    {account && <>
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1"><CardTitle className="flex items-center gap-2 text-2xl"><Building2 className="h-6 w-6 text-primary" />{account.businessName}</CardTitle><p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{account.locationAddress}, {account.countyName}</p></div>
          <div className="flex flex-col gap-2 sm:flex-row"><Button variant="outline" onClick={() => setContactsOpen(true)}><Users className="mr-2 h-4 w-4" />Manage contacts ({account.contacts.length})</Button><Button onClick={() => setEditOpen(true)}><Pencil className="mr-2 h-4 w-4" />Edit account</Button></div>
        </CardHeader>
        <CardContent className="grid gap-4 border-t pt-6 sm:grid-cols-2">
          <div><p className="text-sm text-muted-foreground">Account owner</p><p className="font-medium">{account.owner ? `${account.owner.firstName} ${account.owner.lastName}` : "Unassigned"}</p></div>
          <div><p className="text-sm text-muted-foreground">Business history</p><p className="font-medium">{account.shortHistory || "No history recorded"}</p></div>
        </CardContent>
      </Card>
      <AccountDialog open={editOpen} onOpenChange={setEditOpen} account={account} />
      <AccountContactsDialog open={contactsOpen} onOpenChange={setContactsOpen} account={account} />
    </>}
  </section>;
}
