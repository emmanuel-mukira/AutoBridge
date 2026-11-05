import { useState } from "react";
import { CircleCheck, CircleX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OpportunityStageDialog } from "@/features/opportunities/components/OpportunityStageDialog";
import { useTransitionOpportunity } from "@/features/opportunities/hooks/useOpportunities";
import type {
  ConfirmedSaleInput,
  Opportunity,
  OpportunityOutcome,
  OpportunityStage,
} from "@/features/opportunities/services/opportunitiesApi";
import type { Quotation } from "../services/quotationsApi";

export function QuotationOutcomePrompt({
  quotation,
  opportunity,
}: {
  quotation: Quotation;
  opportunity: Opportunity;
}) {
  const [requestedOutcome, setRequestedOutcome] =
    useState<OpportunityOutcome | null>(null);
  const transition = useTransitionOpportunity();
  if (
    !quotation.current ||
    (quotation.status !== "ACCEPTED" && quotation.status !== "REJECTED")
  )
    return null;

  const closeOpportunity = async (
    stage: OpportunityStage,
    outcome?: OpportunityOutcome,
    confirmedSale?: ConfirmedSaleInput,
  ) => {
    await transition.mutateAsync({
      id: opportunity.id,
      stage,
      outcome,
      confirmedSale,
    });
    setRequestedOutcome(null);
  };

  if (opportunity.outcome) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 text-sm">
        This quotation is {quotation.status.toLowerCase()}. The opportunity was
        separately confirmed as {opportunity.outcome === "WON" ? "Won" : "Lost"}
        .
      </div>
    );
  }

  const accepted = quotation.status === "ACCEPTED";
  return (
    <>
      <div
        className={`rounded-lg border p-4 ${accepted ? "border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/20" : "border-amber-500/40 bg-amber-50/60 dark:bg-amber-950/20"}`}
      >
        <div className="flex gap-3">
          {accepted ? (
            <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <CircleX className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          )}
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold">
                {accepted
                  ? "Quotation accepted. Has the sale been confirmed?"
                  : "Quotation rejected. The opportunity remains open."}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {accepted
                  ? "Only confirm Won after the sale or order is genuinely secured."
                  : "Create a revised quotation, keep negotiating, or explicitly close the opportunity as Lost."}
              </p>
            </div>
            <Button
              size="sm"
              variant={accepted ? "default" : "outline"}
              onClick={() => setRequestedOutcome(accepted ? "WON" : "LOST")}
            >
              {accepted
                ? "Confirm sale and mark opportunity Won"
                : "Close opportunity as Lost"}
            </Button>
          </div>
        </div>
      </div>
      <OpportunityStageDialog
        opportunity={opportunity}
        initialStage="CLOSED"
        initialOutcome={requestedOutcome ?? undefined}
        initialConfirmedSale={
          requestedOutcome === "WON"
            ? {
                confirmedAmount: Number(quotation.totalAmount).toFixed(2),
                confirmedCurrency: quotation.currency,
              }
            : undefined
        }
        title={
          requestedOutcome === "WON"
            ? "Confirm sale"
            : "Close opportunity as Lost"
        }
        description={
          requestedOutcome === "WON"
            ? "Record the confirmed sale value before marking this opportunity Won. Quotation acceptance alone is not a sale."
            : "Confirm that negotiation has ended before marking this opportunity Lost."
        }
        submitLabel={
          requestedOutcome === "WON"
            ? "Confirm sale and mark Won"
            : "Mark opportunity Lost"
        }
        open={requestedOutcome !== null}
        onOpenChange={(open) => !open && setRequestedOutcome(null)}
        onSubmit={closeOpportunity}
        pending={transition.isPending}
        error={transition.error}
      />
    </>
  );
}
