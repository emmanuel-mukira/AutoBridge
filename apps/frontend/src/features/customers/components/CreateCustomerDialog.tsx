import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateCustomer, useUpdateCustomer } from "../hooks/useCustomers";
import { CUSTOMER_CATEGORIES } from "../utils/categoryUtils";
import type { CreateCustomerInput, Customer } from "../types/index";

interface CreateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (customer: Customer) => void;
  customer?: Customer;
}

export function CreateCustomerDialog({
  open,
  onOpenChange,
  onSuccess,
  customer,
}: CreateCustomerDialogProps) {
  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer();
  const isEditing = !!customer;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateCustomerInput>({
    mode: "onBlur",
  });

  useEffect(() => {
    if (customer) {
      setValue("companyName", customer.companyName);
      setValue("countyName", customer.countyName);
      setValue("locationAddress", customer.locationAddress);
      setValue("shortHistory", customer.shortHistory || "");
      setValue("category", customer.category);
    }
  }, [customer, setValue]);

  const onSubmit = async (data: CreateCustomerInput) => {
    try {
      if (isEditing && customer) {
        const updated = await updateCustomerMutation.mutateAsync({
          id: customer.id,
          data,
        });
        reset();
        onOpenChange(false);
        onSuccess?.(updated);
      } else {
        const created = await createCustomerMutation.mutateAsync(data);
        reset();
        onOpenChange(false);
        onSuccess?.(created);
      }
    } catch (error) {
      // Error is handled by TanStack Query and toast notification
      console.error('Failed to save customer:', error);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Customer" : "Create New Customer"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name *</Label>
            <Input
              id="companyName"
              {...register("companyName", {
                required: "Company name is required",
                minLength: {
                  value: 2,
                  message: "Company name must be at least 2 characters",
                },
                validate: (value) => value.trim().length > 0 || "Company name cannot be empty",
              })}
            />
            {errors.companyName && (
              <p className="text-sm text-destructive">
                {errors.companyName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="countyName">County *</Label>
            <Input
              id="countyName"
              {...register("countyName", {
                required: "County is required",
                minLength: {
                  value: 2,
                  message: "County must be at least 2 characters",
                },
                validate: (value) => value.trim().length > 0 || "County cannot be empty",
              })}
            />
            {errors.countyName && (
              <p className="text-sm text-destructive">
                {errors.countyName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="locationAddress">Location Address *</Label>
            <Input
              id="locationAddress"
              {...register("locationAddress", {
                required: "Location address is required",
                minLength: {
                  value: 3,
                  message: "Location address must be at least 3 characters",
                },
                validate: (value) => value.trim().length > 0 || "Location address cannot be empty",
              })}
            />
            {errors.locationAddress && (
              <p className="text-sm text-destructive">
                {errors.locationAddress.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="shortHistory">Short History (Optional)</Label>
            <Input
              id="shortHistory"
              {...register("shortHistory")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category (Optional)</Label>
            <select
              id="category"
              {...register("category")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Select a category...</option>
              {CUSTOMER_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={
                createCustomerMutation.isPending || 
                updateCustomerMutation.isPending ||
                Object.keys(errors).length > 0
              }
            >
              {isEditing
                ? updateCustomerMutation.isPending
                  ? "Updating..."
                  : "Update Customer"
                : createCustomerMutation.isPending
                ? "Creating..."
                : "Create Customer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
