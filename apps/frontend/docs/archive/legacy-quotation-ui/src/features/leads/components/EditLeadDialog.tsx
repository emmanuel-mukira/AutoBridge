import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLeadsStore } from "../store/leadsStore";
import { useUpdateLead } from "../hooks/useLeads";
import type { UpdateLeadInput, LeadStatus } from "../types";

const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "OPEN", label: "Open" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

export function EditLeadDialog() {
  const isEditDialogOpen = useLeadsStore((state) => state.isEditDialogOpen);
  const closeEditDialog = useLeadsStore((state) => state.closeEditDialog);
  const selectedLead = useLeadsStore((state) => state.selectedLead);
  const updateLeadMutation = useUpdateLead();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateLeadInput>({
    mode: "onBlur",
  });

  const status = watch("status");

  useEffect(() => {
    if (selectedLead) {
      setValue("status", selectedLead.status);
      setValue("generatorRecommended", selectedLead.generatorRecommended || "");
    } else {
      setValue("status", "DRAFT");
    }
  }, [selectedLead, setValue]);

  const onSubmit = async (data: UpdateLeadInput) => {
    if (!selectedLead) return;
    
    try {
      await updateLeadMutation.mutateAsync({ id: selectedLead.id, data });
      reset();
      closeEditDialog();
    } catch (error) {
      // Error is handled by TanStack Query and toast notification
      console.error('Failed to update lead:', error);
    }
  };

  const handleClose = () => {
    reset();
    closeEditDialog();
  };

  return (
    <Dialog open={isEditDialogOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Lead</DialogTitle>
          <DialogDescription>
            Update lead information and status
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="generatorRecommended">
              Generator Recommended (Optional)
            </Label>
            <Input
              id="generatorRecommended"
              {...register("generatorRecommended")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={status || "DRAFT"}
              onValueChange={(value: string) => setValue("status", value as LeadStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={
                updateLeadMutation.isPending ||
                Object.keys(errors).length > 0
              }
            >
              {updateLeadMutation.isPending ? "Updating..." : "Update Lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
