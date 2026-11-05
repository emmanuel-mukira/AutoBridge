import { useMemo, useState, type FormEvent } from "react";
import { Search, ShieldCheck, UserPlus } from "lucide-react";
import { useAuth } from "@/app/auth/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PasswordInput } from "@/components/PasswordInput";
import { clientsApi } from "@/features/clients/services/clientsApi";
import { adminUsersApi, type UserInput, type UserSummary } from "@/features/admin/services/adminUsers";
import { useUserAction, useUsers } from "@/features/admin/hooks/useUsers";

const empty: UserInput = { firstName: "", lastName: "", email: "", role: "SALES_REP" };
const statusStyle = { PENDING: "bg-amber-100 text-amber-800", ACTIVE: "bg-emerald-100 text-emerald-800", DISABLED: "bg-slate-200 text-slate-700" } as const;

export default function AdminUsers() {
  const { user: current } = useAuth();
  const users = useUsers();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<UserSummary | null>(null);
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<UserSummary | null>(null);
  const [assigning, setAssigning] = useState<{ clientId: number; clientName: string; ownerId: number } | null>(null);
  const [form, setForm] = useState<UserInput>(empty);
  const [password, setPassword] = useState("");
  const [targetOwner, setTargetOwner] = useState("");

  const create = useUserAction((input: UserInput & { password: string }) => adminUsersApi.create(input), "User created");
  const update = useUserAction(({ id, input }: { id: number; input: UserInput }) => adminUsersApi.update(id, input), "User updated");
  const status = useUserAction(({ id, value }: { id: number; value: "APPROVED" | "ACTIVE" | "DISABLED" }) => adminUsersApi.status(id, value), "Account status updated");
  const reset = useUserAction(({ id, value }: { id: number; value: string }) => adminUsersApi.resetPassword(id, value), "Temporary password saved and sessions revoked");
  const assign = useUserAction(({ clientId, ownerId }: { clientId: number; ownerId: number }) => clientsApi.update(clientId, { ownerId }), "Client reassigned");

  const rows = useMemo(() => (users.data ?? []).filter((item) => `${item.firstName} ${item.lastName} ${item.email}`.toLowerCase().includes(search.toLowerCase())), [users.data, search]);
  const targets = (users.data ?? []).filter((item) => item.role === "SALES_REP" && item.status === "ACTIVE");

  function openCreate() { setForm(empty); setPassword(""); setCreating(true); }
  function openEdit(item: UserSummary) { setForm({ firstName: item.firstName, lastName: item.lastName, email: item.email, role: item.role }); setEditing(item); }
  function submitAccount(event: FormEvent) {
    event.preventDefault();
    if (editing) update.mutate({ id: editing.id, input: form }, { onSuccess: () => setEditing(null) });
    else create.mutate({ ...form, password }, { onSuccess: () => setCreating(false) });
  }
  function changeStatus(item: UserSummary, value: "APPROVED" | "ACTIVE" | "DISABLED") {
    if (value === "DISABLED" && !window.confirm(`Disable ${item.firstName} ${item.lastName}? Their active sessions will end.`)) return;
    status.mutate({ id: item.id, value });
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-2xl font-bold">User Management</h1><p className="text-sm text-muted-foreground">Approve registrations, administer accounts and reassign client responsibility.</p></div>
        <Button onClick={openCreate}><UserPlus className="mr-2 h-4 w-4" />Create user</Button>
      </header>
      <div className="relative max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search names or email" aria-label="Search users" /></div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Assigned clients</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {users.isLoading ? <TableRow><TableCell colSpan={5} className="h-24 text-center">Loading users…</TableCell></TableRow> : rows.length === 0 ? <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No users found.</TableCell></TableRow> : rows.map((item) => (
              <TableRow key={item.id}>
                <TableCell><p className="font-medium">{item.firstName} {item.lastName}</p><p className="text-xs text-muted-foreground">{item.email}</p>{item.mustChangePassword && <p className="mt-1 text-xs text-amber-700">Password change required</p>}</TableCell>
                <TableCell><Badge variant="outline">{item.role === "ADMIN" ? "Administrator" : "Sales Representative"}</Badge></TableCell>
                <TableCell><Badge className={statusStyle[item.status]}>{item.status}</Badge></TableCell>
                <TableCell><div className="space-y-1">{item.ownedClients.length ? item.ownedClients.map((client) => <button key={client.id} className="block text-left text-sm text-primary hover:underline" onClick={() => { setAssigning({ clientId: client.id, clientName: client.businessName, ownerId: item.id }); setTargetOwner(""); }}>{client.businessName}</button>) : <span className="text-sm text-muted-foreground">None</span>}</div></TableCell>
                <TableCell><div className="flex flex-wrap justify-end gap-2"><Button size="sm" variant="outline" onClick={() => openEdit(item)}>Edit</Button>{item.status === "PENDING" && <Button size="sm" onClick={() => changeStatus(item, "APPROVED")}>Approve</Button>}{item.status === "DISABLED" && <Button size="sm" onClick={() => changeStatus(item, "ACTIVE")}>Reactivate</Button>}{item.status === "ACTIVE" && item.id !== current?.id && <Button size="sm" variant="outline" onClick={() => changeStatus(item, "DISABLED")}>Disable</Button>}<Button size="sm" variant="ghost" onClick={() => { setPassword(""); setResetting(item); }}>Reset password</Button></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={creating || Boolean(editing)} onOpenChange={(open) => { if (!open) { setCreating(false); setEditing(null); } }}><DialogContent><form onSubmit={submitAccount} className="space-y-4"><DialogHeader><DialogTitle>{editing ? "Edit user" : "Create user"}</DialogTitle></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="firstName">First name</Label><Input id="firstName" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required /></div><div><Label htmlFor="lastName">Last name</Label><Input id="lastName" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required /></div></div><div><Label htmlFor="userEmail">Email</Label><Input id="userEmail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div><div><Label>Role</Label><Select value={form.role} onValueChange={(role) => setForm({ ...form, role: role as UserInput["role"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="SALES_REP">Sales Representative</SelectItem><SelectItem value="ADMIN">Administrator</SelectItem></SelectContent></Select></div>{!editing && <div><Label htmlFor="initialPassword">Temporary password</Label><PasswordInput id="initialPassword" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required /><p className="mt-1 text-xs text-muted-foreground">At least 6 characters. The user must change it after signing in.</p></div>}<DialogFooter><Button type="submit" disabled={create.isPending || update.isPending}>{editing ? "Save changes" : "Create account"}</Button></DialogFooter></form></DialogContent></Dialog>

      <Dialog open={Boolean(resetting)} onOpenChange={(open) => !open && setResetting(null)}><DialogContent><form onSubmit={(event) => { event.preventDefault(); if (resetting) reset.mutate({ id: resetting.id, value: password }, { onSuccess: () => setResetting(null) }); }} className="space-y-4"><DialogHeader><DialogTitle>Reset password</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Set a temporary password for {resetting?.firstName}. Existing sessions will be revoked.</p><div><Label htmlFor="temporaryPassword">Temporary password</Label><PasswordInput id="temporaryPassword" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required /></div><DialogFooter><Button type="submit">Reset password</Button></DialogFooter></form></DialogContent></Dialog>

      <Dialog open={Boolean(assigning)} onOpenChange={(open) => !open && setAssigning(null)}><DialogContent><form onSubmit={(event) => { event.preventDefault(); if (assigning && targetOwner) assign.mutate({ clientId: assigning.clientId, ownerId: Number(targetOwner) }, { onSuccess: () => { users.refetch(); setAssigning(null); } }); }} className="space-y-4"><DialogHeader><DialogTitle>Reassign client</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">Transfer {assigning?.clientName} and its opportunities and follow-ups to another active Sales Representative.</p><div><Label>New owner</Label><Select value={targetOwner} onValueChange={setTargetOwner}><SelectTrigger><SelectValue placeholder="Select representative" /></SelectTrigger><SelectContent>{targets.filter((item) => item.id !== assigning?.ownerId).map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.firstName} {item.lastName}</SelectItem>)}</SelectContent></Select></div><DialogFooter><Button type="submit" disabled={!targetOwner || assign.isPending}><ShieldCheck className="mr-2 h-4 w-4" />Reassign client</Button></DialogFooter></form></DialogContent></Dialog>
    </section>
  );
}
