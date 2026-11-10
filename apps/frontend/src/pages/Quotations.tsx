import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/shared/TablePagination";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, FileText, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/app/auth/useAuth";
import { useOpportunityOwners } from "@/features/opportunities/hooks/useOpportunities";
import { useQuotationSeries } from "@/features/quotations/hooks/useQuotations";
import type { QuotationStatus } from "@/features/quotations/services/quotationsApi";

const all = "all";
type EffectiveStatus = Exclude<QuotationStatus, "SUPERSEDED">;
const statuses: EffectiveStatus[] = ["DRAFT", "SENT", "ACCEPTED", "REJECTED"];
const money = (value: string) =>
  `KES ${Number(value).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Quotations() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | EffectiveStatus>("");
  const [ownerId, setOwnerId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const owners = useOpportunityOwners();
  const query = useQuotationSeries({
    search: search || undefined,
    status: status || undefined,
    ownerId: Number(ownerId) || undefined,
    from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
    page,
    limit: pageSize,
  });
  const quotations = query.data?.series ?? [];
  const pagination = query.data?.pagination;

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Quotations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One row per quotation, with every revision preserved in its detail
          view.
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_170px_200px_155px_155px]">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Quotation, client or opportunity"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={status || all}
          onValueChange={(value) => {
            setStatus(value === all ? "" : (value as EffectiveStatus));
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filter by effective status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={all}>All current statuses</SelectItem>
            {statuses.map((value) => (
              <SelectItem key={value} value={value}>
                {value[0] + value.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {user?.role === "ADMIN" && (
          <Select
            value={ownerId || all}
            onValueChange={(value) => {
              setOwnerId(value === all ? "" : value);
              setPage(1);
            }}
          >
            <SelectTrigger aria-label="Filter by salesperson">
              <SelectValue placeholder="All salespeople" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={all}>All salespeople</SelectItem>
              {owners.data?.map((owner) => (
                <SelectItem key={owner.id} value={String(owner.id)}>
                  {owner.firstName} {owner.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Input
          type="date"
          aria-label="Created from"
          value={from}
          onChange={(event) => {
            setFrom(event.target.value);
            setPage(1);
          }}
        />
        <Input
          type="date"
          aria-label="Created to"
          value={to}
          onChange={(event) => {
            setTo(event.target.value);
            setPage(1);
          }}
        />
      </div>
      {query.isLoading && (
        <p className="text-muted-foreground">Loading quotations...</p>
      )}
      {query.error && (
        <p role="alert" className="text-destructive">
          Unable to load quotations.
        </p>
      )}
      {!query.isLoading && !query.error && quotations.length === 0 && (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p>No quotations match these filters.</p>
        </div>
      )}
      {quotations.length > 0 && (
        <div className="max-h-[60svh] overflow-auto sm:max-h-none rounded-lg border bg-card">
          <Table className="w-full min-w-[640px] text-sm">
            <TableHeader className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <TableRow>
                <TableHead className="p-2">Quotation</TableHead>
                <TableHead className="p-2">Client / opportunity</TableHead>
                <TableHead className="p-2">Salesperson</TableHead>
                <TableHead className="p-2">Effective version</TableHead>
                <TableHead className="p-2 text-right">Final amount</TableHead>
                <TableHead className="p-2">Status</TableHead>
                <TableHead className="p-2">Date</TableHead>
                <TableHead className="p-2">
                  <span className="sr-only">Action</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotations.map((quotation) => (
                <TableRow key={quotation.quoteNumber} className="border-t">
                  <TableCell className="p-2 font-medium">
                    {quotation.quoteNumber}
                    <span className="block text-xs text-muted-foreground">
                      {quotation.versionCount} saved version
                      {quotation.versionCount === 1 ? "" : "s"}
                    </span>
                  </TableCell>
                  <TableCell className="p-2">
                    <span className="font-medium">
                      {quotation.client.businessName}
                    </span>
                    <Link
                      className="block text-xs text-primary hover:underline"
                      to={`/dashboard/opportunities/${quotation.opportunityId}`}
                    >
                      {quotation.opportunity.title}
                    </Link>
                  </TableCell>
                  <TableCell className="p-2">
                    {quotation.opportunity.owner.firstName}{" "}
                    {quotation.opportunity.owner.lastName}
                  </TableCell>
                  <TableCell className="p-2">Version {quotation.version}</TableCell>
                  <TableCell className="p-2 text-right font-semibold">
                    {money(quotation.totalAmount)}
                  </TableCell>
                  <TableCell className="p-2">
                    <Badge variant="outline">
                      {quotation.status[0] +
                        quotation.status.slice(1).toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="p-2">
                    {new Date(
                      quotation.issueDate ?? quotation.createdAt,
                    ).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="p-2 text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/dashboard/quotations/${quotation.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {pagination && <TablePagination page={page} pageSize={pageSize} totalCount={pagination.total} totalPages={Math.max(1, pagination.totalPages)} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />}
    </section>
  );
}
