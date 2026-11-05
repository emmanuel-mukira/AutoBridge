import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CopyPlus, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuotationDialog } from "@/features/quotations/components/QuotationDialog";
import { QuotationPrintButton } from "@/features/quotations/components/QuotationPrintButton";
import { QuotationOutcomePrompt } from "@/features/quotations/components/QuotationOutcomePrompt";
import { QuotationSendAction } from "@/features/quotations/components/QuotationSendAction";
import { useOpportunity } from "@/features/opportunities/hooks/useOpportunities";
import {
  useOpportunityQuotations,
  useQuotation,
  useReviseQuotation,
  useUpdateQuotationStatus,
} from "@/features/quotations/hooks/useQuotations";

const money = (value: string) =>
  `KES ${Number(value).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function QuotationDetails() {
  const id = Number(useParams<{ id: string }>().id);
  const [editOpen, setEditOpen] = useState(false);
  const query = useQuotation(id);
  const quotation = query.data;
  const opportunity = useOpportunity(quotation?.opportunityId ?? 0);
  const history = useOpportunityQuotations(quotation?.opportunityId ?? 0);
  const revise = useReviseQuotation(quotation?.opportunityId ?? 0);
  const transition = useUpdateQuotationStatus(quotation?.opportunityId ?? 0);
  return (
    <section className="space-y-4">
      <Link className="text-primary hover:underline" to="/dashboard/quotations">
        ← Quotations
      </Link>
      {query.isLoading && <p>Loading quotation...</p>}
      {query.error && (
        <p role="alert" className="text-destructive">
          Quotation not found or access denied.
        </p>
      )}
      {quotation && (
        <>
          <Card>
            <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <CardTitle>
                    {quotation.quoteNumber} · Version {quotation.version}
                  </CardTitle>
                  <Badge variant="outline">
                    {quotation.status[0] +
                      quotation.status.slice(1).toLowerCase()}
                  </Badge>
                  {quotation.current && <Badge>Current effective</Badge>}
                  {quotation.status === "DRAFT" && !quotation.current && (
                    <Badge variant="secondary">Unissued draft</Badge>
                  )}
                  {quotation.status === "SUPERSEDED" && (
                    <Badge variant="secondary">Historical version</Badge>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {quotation.clientNameSnapshot} · {quotation.opportunity.title}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {opportunity.data &&
                  quotation.status === "DRAFT" &&
                  opportunity.data.stage !== "CLOSED" && (
                  <>
                    <Button variant="outline" onClick={() => setEditOpen(true)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit draft
                    </Button>
                    <QuotationSendAction
                      quotation={quotation}
                      opportunity={opportunity.data}
                    />
                  </>
                )}
                {opportunity.data?.stage === "NEGOTIATION" &&
                  (quotation.status === "SENT" ||
                    quotation.status === "REJECTED") && (
                  <>
                    <Button variant="outline" onClick={() => revise.mutate(id)}>
                      <CopyPlus className="mr-2 h-4 w-4" />
                      Create revision
                    </Button>
                    {quotation.status === "SENT" && (
                      <>
                        <Button
                          onClick={() =>
                            transition.mutate({ id, status: "ACCEPTED" })
                          }
                        >
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() =>
                            transition.mutate({ id, status: "REJECTED" })
                          }
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </>
                  )}
                <QuotationPrintButton quotation={quotation} />
              </div>
            </CardHeader>
            <CardContent className="space-y-6 border-t pt-6">
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-sm text-muted-foreground">
                    Prepared for
                  </dt>
                  <dd className="font-medium">
                    {quotation.clientNameSnapshot}
                  </dd>
                  <dd className="text-sm">
                    {quotation.contactNameSnapshot ?? "No named contact"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Prepared by</dt>
                  <dd className="font-medium">
                    {quotation.createdBy.firstName}{" "}
                    {quotation.createdBy.lastName}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Issue date</dt>
                  <dd className="font-medium">
                    {quotation.issueDate
                      ? new Date(quotation.issueDate).toLocaleDateString()
                      : "Not issued"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Valid until</dt>
                  <dd className="font-medium">
                    {new Date(quotation.validUntil).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-sm">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                      <th className="p-3">Product</th>
                      <th className="p-3">Unit</th>
                      <th className="p-3 text-right">Quantity</th>
                      <th className="p-3 text-right">Unit price</th>
                      <th className="p-3 text-right">Line total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotation.items.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-3">
                          <span className="font-medium">
                            {item.productNameSnapshot}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {item.skuSnapshot}{" "}
                            {item.brandSnapshot
                              ? `· ${item.brandSnapshot}`
                              : ""}
                          </span>
                        </td>
                        <td className="p-3">{item.unitSnapshot}</td>
                        <td className="p-3 text-right">{item.quantity}</td>
                        <td className="p-3 text-right">
                          {money(item.unitPrice)}
                        </td>
                        <td className="p-3 text-right font-medium">
                          {money(item.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="ml-auto max-w-sm space-y-2 rounded-md bg-muted/40 p-4 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <strong>{money(quotation.subtotal)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Discount ({quotation.discountPercent}%)</span>
                  <strong>− {money(quotation.discountAmount)}</strong>
                </div>
                <div className="flex justify-between border-t pt-2 text-base">
                  <span>Total</span>
                  <strong>{money(quotation.totalAmount)}</strong>
                </div>
              </div>
              {(quotation.notes || quotation.terms) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {quotation.notes && (
                    <div>
                      <h2 className="font-semibold">Notes</h2>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                        {quotation.notes}
                      </p>
                    </div>
                  )}
                  {quotation.terms && (
                    <div>
                      <h2 className="font-semibold">Commercial terms</h2>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                        {quotation.terms}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          {opportunity.data && (
            <QuotationOutcomePrompt
              quotation={quotation}
              opportunity={opportunity.data}
            />
          )}
          <Card>
            <CardHeader>
              <CardTitle>Version history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {history.data
                ?.filter(
                  (version) => version.quoteNumber === quotation.quoteNumber,
                )
                ?.sort((a, b) => b.version - a.version)
                .map((version) => (
                  <Link
                    key={version.id}
                    to={`/dashboard/quotations/${version.id}`}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 hover:bg-muted/40 ${version.id === id ? "border-primary" : ""}`}
                  >
                    <span>
                      <span className="font-medium">
                        Version {version.version} ·{" "}
                        {version.status[0] +
                          version.status.slice(1).toLowerCase()}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {version.current
                          ? "Current effective"
                          : version.status === "DRAFT"
                            ? "Unissued draft"
                            : "Historical"}
                      </span>
                    </span>
                    <span>{money(version.totalAmount)}</span>
                  </Link>
                ))}
            </CardContent>
          </Card>
          <QuotationDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            opportunityId={quotation.opportunityId}
            clientId={quotation.clientId}
            quotation={quotation}
          />
        </>
      )}
    </section>
  );
}
