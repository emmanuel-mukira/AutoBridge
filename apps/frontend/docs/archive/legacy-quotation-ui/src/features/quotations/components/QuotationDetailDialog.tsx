import { useQuotationsStore } from "../store/quotationsStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { History } from "lucide-react";

export function QuotationDetailDialog() {
  const { isDetailDialogOpen, closeDetailDialog, selectedQuotation, openVersionHistoryDialog } = useQuotationsStore();

  if (!selectedQuotation) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT": return "bg-gray-500";
      case "SENT": return "bg-blue-500";
      case "ACCEPTED": return "bg-green-500";
      case "REJECTED": return "bg-red-500";
      case "SUPERSEDED": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  const handleViewHistory = () => {
    closeDetailDialog();
    openVersionHistoryDialog(selectedQuotation);
  };

  return (
    <Dialog open={isDetailDialogOpen} onOpenChange={closeDetailDialog}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Quotation Details</DialogTitle>
          <DialogDescription>
            Complete information about {selectedQuotation.quoteNumber} v{selectedQuotation.version}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Quote Number</h3>
              <p className="text-base font-semibold">{selectedQuotation.quoteNumber}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(selectedQuotation.status)}>
                {selectedQuotation.status}
              </Badge>
              <Badge variant="outline">v{selectedQuotation.version}</Badge>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Customer</h3>
            <p className="text-base font-semibold">{selectedQuotation.customer.companyName}</p>
            <p className="text-sm text-muted-foreground">
              {selectedQuotation.customer.countyName} - {selectedQuotation.customer.locationAddress}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Sales Representative</h3>
            <p className="text-base">
              {selectedQuotation.salesRep.firstName} {selectedQuotation.salesRep.lastName}
            </p>
            <p className="text-sm text-muted-foreground">{selectedQuotation.salesRep.email}</p>
          </div>

          {selectedQuotation.lead && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Associated Lead</h3>
              <p className="text-base">
                {selectedQuotation.lead.generatorRecommended || "No generator specified"}
              </p>
              <Badge variant="outline" className="mt-1">
                {selectedQuotation.lead.status}
              </Badge>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Total Price</h3>
              <p className="text-lg font-bold">
                KES {Number(selectedQuotation.totalPrice).toLocaleString()}
              </p>
            </div>
            {selectedQuotation.discount && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Discount</h3>
                <p className="text-lg font-bold">{selectedQuotation.discount}%</p>
              </div>
            )}
          </div>

          {selectedQuotation.notes && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Notes</h3>
              <p className="text-sm whitespace-pre-wrap">{selectedQuotation.notes}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium text-muted-foreground">Created</h3>
              <p>{new Date(selectedQuotation.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <h3 className="font-medium text-muted-foreground">Last Updated</h3>
              <p>{new Date(selectedQuotation.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={handleViewHistory}>
            <History className="h-4 w-4 mr-2" />
            Version History
          </Button>
          <Button onClick={closeDetailDialog}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
