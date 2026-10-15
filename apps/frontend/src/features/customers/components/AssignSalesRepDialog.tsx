import { useEffect, useState } from "react";
import { useAuth } from "@/app/auth/useAuth";
import { http } from "@/lib/http";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssignSalesRep } from "../hooks/useCustomers";
import type { Customer } from "../types";

interface AssignSalesRepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

interface SalesRep {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface ListUsersResponse {
  users?: Array<SalesRep & { role?: { name: string } }>;
}

export function AssignSalesRepDialog({
  open,
  onOpenChange,
  customer,
}: AssignSalesRepDialogProps) {
  const { user } = useAuth();
  const [selectedSalesRepId, setSelectedSalesRepId] = useState<string>("");
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [isLoadingSalesReps, setIsLoadingSalesReps] = useState(false);
  const assignSalesRepMutation = useAssignSalesRep();

  useEffect(() => {
    // Only fetch if dialog is open and we have a fully loaded user with companyId
    if (!open) return;
    
    if (!user) {
      console.log("[AssignSalesRepDialog] Waiting for user to be loaded...");
      return;
    }

    if (!user.companyId) {
      console.error("[AssignSalesRepDialog] User loaded but missing companyId:", user);
      return;
    }

    // Verify user is admin before fetching
    if (!user.groups.includes("admin")) {
      toast.error("Only administrators can assign sales representatives");
      return;
    }

    setIsLoadingSalesReps(true);
    
    http
      .get<ListUsersResponse>(`/api/users`, { params: { companyId: user.companyId } })
      .then((response) => {
        console.log("[AssignSalesRepDialog] Response:", response.data);
        const reps = response.data.users?.filter((u: { role?: { name: string } }) => u.role?.name === "sales_rep") || [];
        console.log("[AssignSalesRepDialog] Filtered sales reps:", reps);
        setSalesReps(reps);
        if (customer?.salesRepId) {
          setSelectedSalesRepId(customer.salesRepId.toString());
        }
      })
      .catch((error) => {
        console.error("[AssignSalesRepDialog] Failed to load sales reps:", error);
        console.error("[AssignSalesRepDialog] Error response:", error.response?.data);
        console.error("[AssignSalesRepDialog] Error status:", error.response?.status);
        
        if (error.response?.status === 401) {
          toast.error("Session expired. Please log in again.");
        } else if (error.response?.status === 403) {
          toast.error("You do not have permission to view sales representatives");
        } else {
          toast.error("Failed to load sales representatives. Please try again.");
        }
      })
      .finally(() => {
        setIsLoadingSalesReps(false);
      });
  }, [open, user, customer?.salesRepId]);

  const handleAssign = async () => {
    if (!customer || !selectedSalesRepId) return;

    try {
      await assignSalesRepMutation.mutateAsync({
        customerId: customer.id,
        salesRepId: Number(selectedSalesRepId),
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to assign sales rep:", error);
    }
  };

  const handleClose = () => {
    setSelectedSalesRepId("");
    onOpenChange(false);
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Sales Representative</DialogTitle>
          <DialogDescription>
            Assign a sales representative to {customer.companyName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Current Assignment</Label>
            <p className="text-sm text-muted-foreground">
              {customer.salesRep
                ? `${customer.salesRep.firstName} ${customer.salesRep.lastName}`
                : "Unassigned"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="salesRep">New Sales Representative *</Label>
            <Select
              value={selectedSalesRepId}
              onValueChange={setSelectedSalesRepId}
              disabled={isLoadingSalesReps}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingSalesReps ? "Loading..." : "Select sales rep"} />
              </SelectTrigger>
              <SelectContent>
                {salesReps.map((rep) => (
                  <SelectItem key={rep.id} value={rep.id.toString()}>
                    {rep.firstName} {rep.lastName} ({rep.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedSalesRepId || assignSalesRepMutation.isPending}
          >
            {assignSalesRepMutation.isPending ? "Assigning..." : "Assign"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
