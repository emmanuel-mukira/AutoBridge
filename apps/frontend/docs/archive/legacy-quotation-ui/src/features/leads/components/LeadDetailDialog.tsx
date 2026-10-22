import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useLeadsStore } from "../store/leadsStore";

export function LeadDetailDialog() {
  const isDetailDialogOpen = useLeadsStore((state) => state.isDetailDialogOpen);
  const closeDetailDialog = useLeadsStore((state) => state.closeDetailDialog);
  const selectedLead = useLeadsStore((state) => state.selectedLead);
  const navigate = useNavigate();

  if (!selectedLead) return null;

  const handleViewCustomer = () => {
    closeDetailDialog();
    navigate("/dashboard/customers");
  };

  return (
    <Dialog open={isDetailDialogOpen} onOpenChange={closeDetailDialog}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Lead Details</DialogTitle>
          <DialogDescription>
            Complete information about {selectedLead.customer.companyName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Customer</h3>
            <p className="text-base font-semibold">{selectedLead.customer.companyName}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Location</h3>
            <p className="text-base">{selectedLead.customer.location}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Industry</h3>
            <p className="text-base">{selectedLead.customer.industry}</p>
          </div>

          {selectedLead.generatorRecommended && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Generator Recommended</h3>
              <p className="text-base">{selectedLead.generatorRecommended}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
              <p className="text-base capitalize">{selectedLead.status.toLowerCase()}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Created</h3>
              <p className="text-base">
                {new Date(selectedLead.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Sales Representative</h3>
            <p className="text-base">
              {selectedLead.salesRep.firstName} {selectedLead.salesRep.lastName}
            </p>
            <p className="text-sm text-muted-foreground">{selectedLead.salesRep.email}</p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={closeDetailDialog}>
              Close
            </Button>
            <Button onClick={handleViewCustomer}>
              View Customer Details
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
