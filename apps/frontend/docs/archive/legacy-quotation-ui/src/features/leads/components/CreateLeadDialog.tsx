import { useForm } from "react-hook-form";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InlineCustomerCreate } from "@/components/shared/InlineCustomerCreate";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { useAuth } from "@/app/auth/useAuth";
import { useLeadsStore } from "../store/leadsStore";
import { useCreateLead } from "../hooks/useLeads";
import { useCustomers } from "@/features/customers/hooks/useCustomers";
import type { CreateLeadInput, LeadStatus } from "../types";
import type { Customer } from "@/features/customers/types/index";

const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "OPEN", label: "Open" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

export function CreateLeadDialog() {
  const { user } = useAuth();
  const isCreateDialogOpen = useLeadsStore((state) => state.isCreateDialogOpen);
  const closeCreateDialog = useLeadsStore((state) => state.closeCreateDialog);
  const createLeadMutation = useCreateLead();
  const { data: customersData } = useCustomers();
  const [showInlineCustomerCreate, setShowInlineCustomerCreate] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
  } = useForm<CreateLeadInput>({
    mode: "onBlur",
    defaultValues: {
      status: "DRAFT",
      salesRepId: user?.id,
    },
  });

  const status = watch("status");
  const customerId = watch("customerId");

  const customers = customersData?.customers || [];

  const onSubmit = async (data: CreateLeadInput) => {
    try {
      await createLeadMutation.mutateAsync(data);
      reset();
      closeCreateDialog();
    } catch (error) {
      console.error('Failed to create lead:', error);
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

  return (
    <Dialog open={isCreateDialogOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Create New Lead</DialogTitle>
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
                  onValueChange={(value: string) => setValue("customerId", Number(value), { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer: Customer) => (
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
              value={status}
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

          </div>

          <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={
                createLeadMutation.isPending || 
                !customerId
              }
            >
              {createLeadMutation.isPending ? "Creating..." : "Create Lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
