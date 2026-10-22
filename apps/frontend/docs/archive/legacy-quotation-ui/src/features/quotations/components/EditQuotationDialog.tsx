import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuotationsStore } from "../store/quotationsStore";
import { useUpdateQuotation } from "../hooks/useQuotations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { UpdateQuotationInput, QuotationStatus } from "@/types/quotation";
import { QUOTATION_STATUSES } from "@/types/quotation";

export function EditQuotationDialog() {
  const { isEditDialogOpen, closeEditDialog, selectedQuotation } = useQuotationsStore();
  const updateQuotationMutation = useUpdateQuotation();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
  } = useForm<UpdateQuotationInput>({
    mode: "onBlur",
  });

  const status = watch("status");

  useEffect(() => {
    if (selectedQuotation) {
      setValue("totalPrice", Number(selectedQuotation.totalPrice));
      setValue("discount", selectedQuotation.discount ? Number(selectedQuotation.discount) : undefined);
      setValue("notes", selectedQuotation.notes || "");
      setValue("status", selectedQuotation.status);
    } else {
      setValue("status", "DRAFT");
    }
  }, [selectedQuotation, setValue]);

  const onSubmit = async (data: UpdateQuotationInput) => {
    if (!selectedQuotation) return;
    
    try {
      await updateQuotationMutation.mutateAsync({ id: selectedQuotation.id, data });
      reset();
      closeEditDialog();
    } catch (error) {
      console.error("Failed to update quotation:", error);
    }
  };

  const handleClose = () => {
    reset();
    closeEditDialog();
  };

  if (!selectedQuotation) return null;

  return (
    <Dialog open={isEditDialogOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Edit Quotation</DialogTitle>
          <DialogDescription>
            Update quotation details. Only DRAFT quotations can be edited.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Input
                value={selectedQuotation.customer.companyName}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalPrice">Total Price *</Label>
              <Input
                id="totalPrice"
                type="number"
                step="0.01"
                {...register("totalPrice", {
                  required: true,
                  valueAsNumber: true,
                  min: 0,
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">Discount (%)</Label>
              <Input
                id="discount"
                type="number"
                step="0.01"
                {...register("discount", {
                  valueAsNumber: true,
                  min: 0,
                  max: 100,
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                {...register("notes")}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status || "DRAFT"}
                onValueChange={(value: string) => setValue("status", value as QuotationStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUOTATION_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateQuotationMutation.isPending}
            >
              {updateQuotationMutation.isPending ? "Updating..." : "Update Quotation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
