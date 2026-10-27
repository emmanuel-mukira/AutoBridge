import { useState } from "react";
import { CopyPlus, FileText, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useOpportunityQuotations,
  useReviseQuotation,
  useUpdateQuotationStatus,
} from "../hooks/useQuotations";
import type { Opportunity } from "@/features/opportunities/services/opportunitiesApi";
import type { Quotation } from "../services/quotationsApi";
import { QuotationDialog } from "./QuotationDialog";
import { QuotationOutcomePrompt } from "./QuotationOutcomePrompt";
import { QuotationPrintButton } from "./QuotationPrintButton";
import { QuotationSendAction } from "./QuotationSendAction";

const money = (value: string) =>
  `KES ${Number(value).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const statusStyle: Record<Quotation["status"], string> = {
  DRAFT: "border-slate-400 text-slate-700 dark:text-slate-300",
  SENT: "border-blue-500 text-blue-700 dark:text-blue-300",
  ACCEPTED: "border-emerald-500 text-emerald-700 dark:text-emerald-300",
  REJECTED: "border-red-500 text-red-700 dark:text-red-300",
  SUPERSEDED: "border-slate-400 text-slate-500",
};

export function QuotationSection({
  opportunity,
}: {
  opportunity: Opportunity;
}) {
  const opportunityId = opportunity.id;
  const clientId = opportunity.clientId;
  const query = useOpportunityQuotations(opportunityId);
  const transition = useUpdateQuotationStatus(opportunityId);
  const revise = useReviseQuotation(opportunityId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Quotation | null>(null);
  const openEdit = (quotation: Quotation) => {
    setEditing(quotation);
    setDialogOpen(true);
  };
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Quotations</CardTitle>
          <CardDescription>
            Versioned commercial history. Issuing a revision updates the
            opportunity value; acceptance does not mark it Won.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {query.isLoading && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Loading quotations...
          </p>
        )}
        {query.error && (
          <p role="alert" className="py-6 text-center text-sm text-destructive">
            Unable to load quotations.
          </p>
        )}
        {query.data?.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No quotation history</p>
          </div>
        )}
        {query.data?.map((quotation) => (
          <article
            key={quotation.id}
            className={`rounded-lg border p-4 ${quotation.current ? "border-primary/60 bg-primary/5" : ""}`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">
                    {quotation.quoteNumber} · Version {quotation.version}
                  </h3>
                  <Badge
                    variant="outline"
                    className={statusStyle[quotation.status]}
                  >
                    {quotation.status[0] +
                      quotation.status.slice(1).toLowerCase()}
                  </Badge>
                  {quotation.current && <Badge>Current value</Badge>}
                  {quotation.status === "DRAFT" && !quotation.current && (
                    <Badge variant="secondary">Latest draft</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {quotation.items.length} item
                  {quotation.items.length === 1 ? "" : "s"} · valid until{" "}
                  {new Date(quotation.validUntil).toLocaleDateString()} ·{" "}
                  {quotation.contactNameSnapshot ?? "No named contact"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Subtotal {money(quotation.subtotal)} · Discount{" "}
                  {quotation.discountPercent}%
                </p>
                <p className="mt-1 text-xl font-semibold">
                  {money(quotation.totalAmount)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {quotation.status === "DRAFT" && opportunity.stage !== "CLOSED" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(quotation)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <QuotationSendAction
                      quotation={quotation}
                      opportunity={opportunity}
                      compact
                    />
                  </>
                )}
                {opportunity.stage === "NEGOTIATION" &&
                  (quotation.status === "SENT" ||
                    quotation.status === "REJECTED") && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => revise.mutate(quotation.id)}
                      disabled={revise.isPending}
                    >
                      <CopyPlus className="mr-2 h-4 w-4" />
                      Create revision
                    </Button>
                    {quotation.status === "SENT" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() =>
                            transition.mutate({
                              id: quotation.id,
                              status: "ACCEPTED",
                            })
                          }
                          disabled={transition.isPending}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            transition.mutate({
                              id: quotation.id,
                              status: "REJECTED",
                            })
                          }
                          disabled={transition.isPending}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </>
                  )}
                <QuotationPrintButton quotation={quotation} />
              </div>
            </div>
            {quotation.current &&
              (quotation.status === "ACCEPTED" ||
                quotation.status === "REJECTED") && (
                <div className="mt-4">
                  <QuotationOutcomePrompt
                    quotation={quotation}
                    opportunity={opportunity}
                  />
                </div>
              )}
          </article>
        ))}
        <QuotationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          opportunityId={opportunityId}
          clientId={clientId}
          quotation={editing}
        />
      </CardContent>
    </Card>
  );
}
