import { useQuotationsStore } from "../store/quotationsStore";
import { useQuotationVersionHistory, useCreateQuotationVersion } from "../hooks/useQuotations";
import type { Quotation } from "@/types/quotation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function VersionHistoryDialog() {
  const { isVersionHistoryDialogOpen, closeVersionHistoryDialog, selectedQuotation, openDetailDialog } = useQuotationsStore();
  const { data: versions, isLoading } = useQuotationVersionHistory(
    selectedQuotation?.quoteNumber || ""
  );
  const createVersionMutation = useCreateQuotationVersion();

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

  const handleCreateNewVersion = async () => {
    try {
      await createVersionMutation.mutateAsync({
        id: selectedQuotation.id,
        data: {
          totalPrice: Number(selectedQuotation.totalPrice),
          discount: selectedQuotation.discount ? Number(selectedQuotation.discount) : undefined,
          notes: selectedQuotation.notes || undefined,
        },
      });
    } catch (error) {
      console.error("Failed to create new version:", error);
    }
  };

  const handleViewVersion = (quotation: Quotation) => {
    closeVersionHistoryDialog();
    openDetailDialog(quotation);
  };

  const latestVersion = versions?.[0];
  const canCreateNewVersion = latestVersion?.id === selectedQuotation.id && 
                               selectedQuotation.status !== "DRAFT";

  return (
    <Dialog open={isVersionHistoryDialogOpen} onOpenChange={closeVersionHistoryDialog}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription>
            All versions of quotation {selectedQuotation.quoteNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-2">
          {canCreateNewVersion && (
            <Button 
              onClick={handleCreateNewVersion}
              disabled={createVersionMutation.isPending}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {createVersionMutation.isPending ? "Creating..." : "Create New Version"}
            </Button>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {versions?.map((version) => (
                <div
                  key={version.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">v{version.version}</Badge>
                        <Badge className={getStatusColor(version.status)}>
                          {version.status}
                        </Badge>
                        {version.id === latestVersion?.id && (
                          <Badge variant="secondary">Latest</Badge>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Price:</span>{" "}
                          <span className="font-semibold">
                            KES {Number(version.totalPrice).toLocaleString()}
                          </span>
                        </div>
                        {version.discount && (
                          <div>
                            <span className="text-muted-foreground">Discount:</span>{" "}
                            <span className="font-semibold">{version.discount}%</span>
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Created: {new Date(version.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewVersion(version)}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={closeVersionHistoryDialog}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
