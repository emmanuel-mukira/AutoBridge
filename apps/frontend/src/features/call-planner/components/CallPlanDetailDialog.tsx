import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useCallPlan } from "../hooks/useCallPlanner";
import { format } from "date-fns";

interface CallPlanDetailDialogProps {
  callPlanId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CallPlanDetailDialog({ callPlanId, open, onOpenChange }: CallPlanDetailDialogProps) {
  const { data: callPlan, isLoading } = useCallPlan(callPlanId);

  if (isLoading || !callPlan) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Call Plan Details</DialogTitle>
          <DialogDescription>
            View complete call plan information.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Customer</p>
              <p className="text-sm font-semibold">{callPlan.customer.companyName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Sales Rep</p>
              <p className="text-sm">
                {callPlan.salesRep.firstName} {callPlan.salesRep.lastName}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Planned Date</p>
              <p className="text-sm">{format(new Date(callPlan.plannedDate), "PPP")}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Day of Week</p>
              <p className="text-sm">{callPlan.dayOfWeek}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Purpose</p>
              <Badge variant="outline">{callPlan.purpose}</Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Location Type</p>
              <p className="text-sm">{callPlan.locationType.replace(/_/g, " ")}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Exact Location</p>
            <p className="text-sm">{callPlan.exactLocation}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Product Line</p>
              <p className="text-sm">{callPlan.productLine.replace(/_/g, " ")}</p>
            </div>
            {callPlan.proposedGenerator && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Proposed Generator</p>
                <p className="text-sm">{callPlan.proposedGenerator}</p>
              </div>
            )}
          </div>

          {callPlan.contactPerson && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Contact Person</p>
              <p className="text-sm">
                {callPlan.contactPerson.firstName} {callPlan.contactPerson.lastName}
              </p>
              {callPlan.contactPerson.email && (
                <p className="text-xs text-muted-foreground">{callPlan.contactPerson.email}</p>
              )}
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-muted-foreground">Status</p>
            {callPlan.isCompleted ? (
              <div>
                <Badge variant="default">Completed</Badge>
                {callPlan.completedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Completed on {format(new Date(callPlan.completedAt), "PPP")}
                  </p>
                )}
                {callPlan.notes && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-muted-foreground">Notes</p>
                    <p className="text-sm mt-1">{callPlan.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <Badge variant="secondary">Upcoming</Badge>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
