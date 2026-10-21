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
import { useSaveAccount } from "../hooks/useAccounts";
import type { Account, AccountInput } from "../services/accountsApi";

interface CreateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (customer: Account) => void;
  customer?: Account;
}

export function CreateCustomerDialog({
  open,
  onOpenChange,
  onSuccess,
  customer,
}: CreateCustomerDialogProps) {
  const saveAccount = useSaveAccount();
  const isEditing = !!customer;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AccountInput>({
    mode: "onBlur",
  });

  useEffect(() => {
    if (customer) {
      setValue("businessName", customer.businessName);
      setValue("countyName", customer.countyName);
      setValue("locationAddress", customer.locationAddress);
      setValue("shortHistory", customer.shortHistory || "");
    }
  }, [customer, setValue]);

  const onSubmit = async (data: AccountInput) => {
    try {
      const saved = await saveAccount.mutateAsync({ id: customer?.id, input: data });
      reset();
      onOpenChange(false);
      onSuccess?.(saved);
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
            <Label htmlFor="businessName">Business Name *</Label>
            <Input
              id="businessName"
              {...register("businessName", {
                required: "Company name is required",
                minLength: {
                  value: 2,
                  message: "Company name must be at least 2 characters",
                },
                validate: (value) => value.trim().length > 0 || "Company name cannot be empty",
              })}
            />
            {errors.businessName && (
              <p className="text-sm text-destructive">
                {errors.businessName.message}
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

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={
                saveAccount.isPending ||
                Object.keys(errors).length > 0
              }
            >
              {isEditing
                ? saveAccount.isPending
                  ? "Updating..."
                  : "Update Customer"
                : saveAccount.isPending
                ? "Creating..."
                : "Create Customer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
