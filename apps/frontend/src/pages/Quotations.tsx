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
import { useQuotations } from "@/features/quotations/hooks/useQuotations";
import type { QuotationStatus } from "@/features/quotations/services/quotationsApi";

const all = "all";
const money = (value: string) =>
  `KES ${Number(value).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Quotations() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | QuotationStatus>("");
  const [ownerId, setOwnerId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const owners = useOpportunityOwners();
  const query = useQuotations({
    search: search || undefined,
    status: status || undefined,
    ownerId: Number(ownerId) || undefined,
    from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
  });
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Quotations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search current quotations and their complete revision history.
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_170px_200px_155px_155px]">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Quotation, client or opportunity"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select
          value={status || all}
          onValueChange={(value) =>
            setStatus(value === all ? "" : (value as QuotationStatus))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={all}>All statuses</SelectItem>
            {["DRAFT", "SENT", "ACCEPTED", "REJECTED", "SUPERSEDED"].map(
              (value) => (
                <SelectItem key={value} value={value}>
                  {value[0] + value.slice(1).toLowerCase()}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        {user?.role === "ADMIN" && (
          <Select
            value={ownerId || all}
            onValueChange={(value) => setOwnerId(value === all ? "" : value)}
          >
            <SelectTrigger>
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
          onChange={(event) => setFrom(event.target.value)}
        />
        <Input
          type="date"
          aria-label="Created to"
          value={to}
          onChange={(event) => setTo(event.target.value)}
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
      {query.data?.length === 0 && (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p>No quotations match these filters.</p>
        </div>
      )}
      {!!query.data?.length && (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Quotation</th>
                <th className="p-3">Client / opportunity</th>
                <th className="p-3">Salesperson</th>
                <th className="p-3 text-right">Subtotal</th>
                <th className="p-3 text-right">Discount</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3">Status</th>
                <th className="p-3">Issued</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((quotation) => (
                <tr key={quotation.id} className="border-t">
                  <td className="p-3 font-medium">
                    {quotation.quoteNumber}
                    <span className="block text-xs text-muted-foreground">
                      Version {quotation.version}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="font-medium">
                      {quotation.client.businessName}
                    </span>
                    <Link
                      className="block text-xs text-primary hover:underline"
                      to={`/dashboard/opportunities/${quotation.opportunityId}`}
                    >
                      {quotation.opportunity.title}
                    </Link>
                  </td>
                  <td className="p-3">
                    {quotation.opportunity.owner.firstName}{" "}
                    {quotation.opportunity.owner.lastName}
                    <span className="block text-xs text-muted-foreground">
                      Created by {quotation.createdBy.firstName}{" "}
                      {quotation.createdBy.lastName}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {money(quotation.subtotal)}
                  </td>
                  <td className="p-3 text-right">
                    {quotation.discountPercent}%
                  </td>
                  <td className="p-3 text-right font-semibold">
                    {money(quotation.totalAmount)}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline">
                        {quotation.status[0] +
                          quotation.status.slice(1).toLowerCase()}
                      </Badge>
                      {quotation.current && <Badge>Current</Badge>}
                    </div>
                  </td>
                  <td className="p-3">
                    {quotation.issueDate
                      ? new Date(quotation.issueDate).toLocaleDateString()
                      : "Not issued"}
                  </td>
                  <td className="p-3">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/dashboard/quotations/${quotation.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
