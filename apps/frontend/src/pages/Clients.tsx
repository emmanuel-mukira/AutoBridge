import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Plus, Search } from "lucide-react";
import { ClientDialog } from "@/features/clients/components/ClientDialog";
import { useClients } from "@/features/clients/hooks/useClients";

export default function Clients() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useClients();
  const clients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data?.clients ?? [];
    return (data?.clients ?? []).filter((client) => [client.businessName, client.countyName, client.owner?.firstName, client.owner?.lastName].some((value) => value?.toLowerCase().includes(query)));
  }, [data?.clients, search]);
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold">Clients</h1><p className="mt-1 text-sm text-muted-foreground">Manage automotive business customers and contacts.</p></div>
        <Button className="w-full sm:w-auto" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />New client</Button>
      </div>
      <div className="relative max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" aria-label="Search clients" placeholder="Search by client, county or owner" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      {error && <p role="alert" className="text-destructive">Unable to load clients. Please try again.</p>}
      {isLoading && <p>Loading clients...</p>}
      {!isLoading && !error && clients.length === 0 && <div className="rounded-lg border border-dashed bg-card py-12 text-center"><Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">{search ? "No clients match your search" : "No clients yet"}</p></div>}
      {!!clients.length && <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
        <Table><TableHeader><TableRow><TableHead>Client</TableHead><TableHead>County</TableHead><TableHead>Location</TableHead><TableHead>Owner</TableHead></TableRow></TableHeader>
          <TableBody>{clients.map((client) => <TableRow key={client.id}>
            <TableCell className="font-medium"><Link className="text-primary hover:underline" to={`/dashboard/clients/${client.id}`}>{client.businessName}</Link></TableCell>
            <TableCell>{client.countyName}</TableCell><TableCell>{client.locationAddress}</TableCell>
            <TableCell>{client.owner ? `${client.owner.firstName} ${client.owner.lastName}` : "—"}</TableCell>
          </TableRow>)}</TableBody></Table>
      </div>}
      <ClientDialog open={open} onOpenChange={setOpen} />
    </section>
  );
}
