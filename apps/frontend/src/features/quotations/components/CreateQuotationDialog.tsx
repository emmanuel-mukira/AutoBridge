import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { InlineCustomerCreate } from "@/components/shared/InlineCustomerCreate";
import type { Customer } from "@/features/customers/types/index";
import { useQuotationsStore } from "../store/quotationsStore";
import { useCreateQuotation } from "../hooks/useQuotations";
import { useCustomers } from "@/features/customers/hooks/useCustomers";
import { useLeads } from "@/features/leads/hooks/useLeads";
import { useAuth } from "@/app/auth/useAuth";
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
import type { CreateQuotationInput, QuotationStatus } from "@/types/quotation";
import { QUOTATION_STATUSES } from "@/types/quotation";

export function CreateQuotationDialog() {
  const { user } = useAuth();
  const { isCreateDialogOpen, closeCreateDialog } = useQuotationsStore();
  const createQuotationMutation = useCreateQuotation();
  const { data: customersData } = useCustomers();
  const { data: leadsData } = useLeads();
  const [showInlineCustomerCreate, setShowInlineCustomerCreate] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
  } = useForm<CreateQuotationInput>({
    mode: "onBlur",
    defaultValues: {
      status: "DRAFT",
      salesRepId: user?.id,
    },
  });

  const customerId = watch("customerId");
  const status = watch("status");

  useEffect(() => {
    if (!isCreateDialogOpen) {
      reset();
    }
  }, [isCreateDialogOpen, reset]);

  const onSubmit = async (data: CreateQuotationInput) => {
    try {
      await createQuotationMutation.mutateAsync(data);
      reset();
      closeCreateDialog();
    } catch (error) {
      console.error("Failed to create quotation:", error);
    }
  };

  const handleClose = () => {
    reset();
    setShowInlineCustomerCreate(false);
    closeCreateDialog();
  };

  const handleCustomerCreated = (customer: Customer) => {
    setValue("customerId", customer.id, { shouldValidate: true });
    setShowInlineCustomerCreate(false);
    toast.success("Customer created successfully");
  };

  const filteredLeads = leadsData?.leads.filter(
    (lead) => !customerId || lead.customerId === Number(customerId)
  );

  return (
    <Dialog open={isCreateDialogOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Create New Quotation</DialogTitle>
          <DialogDescription>
            Create a new quotation for a customer. Fill in the details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="customerId">Customer *</Label>
                {!showInlineCustomerCreate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowInlineCustomerCreate(true)}
                    className="h-6 text-xs"
                  >
                    + New
                  </Button>
                )}
              </div>
              {showInlineCustomerCreate ? (
                <InlineCustomerCreate
                  onSuccess={handleCustomerCreated}
                  onCancel={() => setShowInlineCustomerCreate(false)}
                  requireContact={false}
                />
              ) : (
                <>
                  <Select
                    value={customerId?.toString()}
                    onValueChange={(value) => setValue("customerId", Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customersData?.customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!customerId && (
                    <p className="text-sm text-destructive">
                      Customer is required
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="leadId">Lead (Optional)</Label>
              <Select
                value={watch("leadId")?.toString() || "none"}
                onValueChange={(value) => setValue("leadId", value === "none" ? undefined : Number(value))}
                disabled={!customerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={customerId ? "Select lead for this customer" : "Select a customer first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Lead</SelectItem>
                  {filteredLeads?.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id.toString()}>
                      {lead.generatorRecommended || "No generator"} - {lead.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {customerId && filteredLeads && filteredLeads.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No leads found for this customer
                </p>
              )}
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
                onValueChange={(value) => setValue("status", value as QuotationStatus)}
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
              disabled={!customerId || createQuotationMutation.isPending}
            >
              {createQuotationMutation.isPending ? "Creating..." : "Create Quotation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
