import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InlineCustomerCreate } from "@/components/shared/InlineCustomerCreate";
import type { Customer } from "@/features/customers/types/index";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import * as React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/app/auth/useAuth";
import { useCreateInteraction } from "../hooks/useInteractions";
import { useCustomers } from "@/features/customers/hooks/useCustomers";
import type { CreateInteractionInput, InteractionType } from "../types";

const INTERACTION_TYPES: { value: InteractionType; label: string }[] = [
  { value: "CALL", label: "Call" },
  { value: "EMAIL", label: "Email" },
  { value: "MEETING", label: "Meeting" },
  { value: "SITE_VISIT", label: "Site Visit" },
  { value: "FOLLOW_UP", label: "Follow Up" },
];

interface CreateInteractionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateInteractionDialog({ open, onOpenChange }: CreateInteractionDialogProps) {
  const { user } = useAuth();
  const createMutation = useCreateInteraction();
  const { data: customersData } = useCustomers();
  const [showInlineCustomerCreate, setShowInlineCustomerCreate] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
  } = useForm<CreateInteractionInput>({
    defaultValues: {
      salesRepId: user?.id,
      type: "MEETING",
      interactionDate: new Date().toISOString().split('T')[0],
    },
  });

  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());

  const type = watch("type");
  const customerId = watch("customerId");

  const customers = customersData?.customers || [];

  const onSubmit = async (data: CreateInteractionInput) => {
    try {
      const payload: CreateInteractionInput = {
        ...data,
        interactionDate: data.interactionDate ? new Date(data.interactionDate).toISOString() : undefined,
      };
      await createMutation.mutateAsync(payload);
      reset();
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    reset();
    setShowInlineCustomerCreate(false);
    onOpenChange(false);
  };

  const handleCustomerCreated = (customer: Customer) => {
    setValue("customerId", customer.id, { shouldValidate: true });
    setShowInlineCustomerCreate(false);
    toast.success("Customer created successfully");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Create New Interaction</DialogTitle>
          <DialogDescription>
            Record a new interaction with a customer.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
          <div className="grid grid-cols-2 gap-4">
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
                  requireContact={true}
                />
              ) : (
                <Select
                  value={customerId?.toString() || ""}
                  onValueChange={(value: string) => setValue("customerId", Number(value), { shouldValidate: true })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={type}
                onValueChange={(value: string) => setValue("type", value as InteractionType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERACTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="interactionDate">Interaction Date *</Label>
            <DatePicker
              date={selectedDate}
              onDateChange={(date) => {
                if (date) {
                  setSelectedDate(date);
                  setValue("interactionDate", date.toISOString().split('T')[0], { shouldValidate: true });
                }
              }}
              placeholder="Select interaction date"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes *</Label>
            <Textarea
              id="notes"
              {...register("notes", { required: true })}
              placeholder="Enter interaction details..."
              rows={5}
            />
          </div>

          </div>

          <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || !customerId}
            >
              {createMutation.isPending ? "Creating..." : "Create Interaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
