import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useTransitionOpportunity } from "@/features/opportunities/hooks/useOpportunities";
import type { Opportunity } from "@/features/opportunities/services/opportunitiesApi";
import { useUpdateQuotationStatus } from "../hooks/useQuotations";
import type { Quotation } from "../services/quotationsApi";

export function QuotationSendAction({
  quotation,
  opportunity,
  compact = false,
}: {
  quotation: Quotation;
  opportunity: Opportunity;
  compact?: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const send = useUpdateQuotationStatus(opportunity.id);
  const move = useTransitionOpportunity();
  const earlyStage =
    opportunity.stage === "NEW" || opportunity.stage === "QUALIFYING";
  const pending = send.isPending || move.isPending;

  const moveAndSend = async () => {
    try {
      await move.mutateAsync({ id: opportunity.id, stage: "PROPOSAL" });
      await send.mutateAsync({ id: quotation.id, status: "SENT" });
    } catch {
      /* mutation errors are shown by the existing toast handlers */
    }
  };

  return (
    <>
      <Button
        size={compact ? "sm" : "default"}
        onClick={() =>
          earlyStage
            ? setConfirmOpen(true)
            : send.mutate({ id: quotation.id, status: "SENT" })
        }
        disabled={pending}
      >
        {earlyStage ? "Move to Proposal & send" : "Send quotation"}
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move opportunity to Proposal?</AlertDialogTitle>
            <AlertDialogDescription>
              Quotations are sent from the Proposal stage. AutoBridge will move
              this opportunity to Proposal, then send the quotation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={moveAndSend} disabled={pending}>
              Move to Proposal and send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
