import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useInteraction } from "../hooks/useInteractions";
import { format } from "date-fns";

interface InteractionDetailDialogProps {
  interactionId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INTERACTION_TYPE_LABELS: Record<string, string> = {
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  SITE_VISIT: "Site Visit",
  FOLLOW_UP: "Follow Up",
};

export function InteractionDetailDialog({ interactionId, open, onOpenChange }: InteractionDetailDialogProps) {
  const { data: interaction, isLoading } = useInteraction(interactionId);

  if (isLoading || !interaction) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Interaction Details</DialogTitle>
          <DialogDescription>
            View complete interaction information.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Customer</p>
              <p className="text-sm font-semibold">{interaction.customer.companyName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Sales Rep</p>
              <p className="text-sm">
                {interaction.salesRep.firstName} {interaction.salesRep.lastName}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Type</p>
              <Badge variant="outline">{INTERACTION_TYPE_LABELS[interaction.type]}</Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Date</p>
              <p className="text-sm">{format(new Date(interaction.interactionDate), "PPP")}</p>
            </div>
          </div>

          {interaction.contact && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Contact Person</p>
              <p className="text-sm">
                {interaction.contact.firstName} {interaction.contact.lastName}
              </p>
              {interaction.contact.email && (
                <p className="text-xs text-muted-foreground">{interaction.contact.email}</p>
              )}
              {interaction.contact.phone && (
                <p className="text-xs text-muted-foreground">{interaction.contact.phone}</p>
              )}
            </div>
          )}

          {interaction.lead && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Related Lead</p>
              <Badge variant="secondary">Lead #{interaction.lead.id}</Badge>
            </div>
          )}

          {interaction.quotation && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Related Quotation</p>
              <Badge variant="secondary">{interaction.quotation.quotationNumber}</Badge>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-muted-foreground">Notes</p>
            <p className="text-sm mt-1 whitespace-pre-wrap">{interaction.notes}</p>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
