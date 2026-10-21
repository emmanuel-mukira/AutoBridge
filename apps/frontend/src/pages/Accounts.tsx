import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Plus, Search } from "lucide-react";
import { AccountDialog } from "@/features/customers/components/AccountDialog";
import { useAccounts } from "@/features/customers/hooks/useAccounts";

export default function Accounts() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useAccounts();
  const accounts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data?.accounts ?? [];
    return (data?.accounts ?? []).filter((account) => [account.businessName, account.countyName, account.owner?.firstName, account.owner?.lastName].some((value) => value?.toLowerCase().includes(query)));
  }, [data?.accounts, search]);
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold">Accounts</h1><p className="mt-1 text-sm text-muted-foreground">Manage automotive business customers and contacts.</p></div>
        <Button className="w-full sm:w-auto" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />New account</Button>
      </div>
      <div className="relative max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" aria-label="Search accounts" placeholder="Search by account, county or owner" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      {error && <p role="alert" className="text-destructive">Unable to load accounts. Please try again.</p>}
      {isLoading && <p>Loading accounts...</p>}
      {!isLoading && !error && accounts.length === 0 && <div className="rounded-lg border border-dashed bg-card py-12 text-center"><Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">{search ? "No accounts match your search" : "No accounts yet"}</p></div>}
      {!!accounts.length && <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
        <Table><TableHeader><TableRow><TableHead>Account</TableHead><TableHead>County</TableHead><TableHead>Location</TableHead><TableHead>Owner</TableHead></TableRow></TableHeader>
          <TableBody>{accounts.map((account) => <TableRow key={account.id}>
            <TableCell className="font-medium"><Link className="text-primary hover:underline" to={`/dashboard/accounts/${account.id}`}>{account.businessName}</Link></TableCell>
            <TableCell>{account.countyName}</TableCell><TableCell>{account.locationAddress}</TableCell>
            <TableCell>{account.owner ? `${account.owner.firstName} ${account.owner.lastName}` : "—"}</TableCell>
          </TableRow>)}</TableBody></Table>
      </div>}
      <AccountDialog open={open} onOpenChange={setOpen} />
    </section>
  );
}
