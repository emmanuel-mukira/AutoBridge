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
import { useAccountOwners } from "../hooks/useAccounts";
import { useAuth } from "@/app/auth/useAuth";
import type { Account, AccountInput } from "../services/accountsApi";

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (account: Account) => void;
  account?: Account;
}

export function AccountDialog({
  open,
  onOpenChange,
  onSuccess,
  account,
}: AccountDialogProps) {
  const saveAccount = useSaveAccount();
  const { user } = useAuth();
  const { data: owners } = useAccountOwners();
  const isEditing = !!account;

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
    if (account) {
      setValue("businessName", account.businessName);
      setValue("countyName", account.countyName);
      setValue("locationAddress", account.locationAddress);
      setValue("shortHistory", account.shortHistory || "");
      setValue("ownerId", account.ownerId);
    } else if (user) {
      setValue("ownerId", user.id);
    }
  }, [account, setValue, user]);

  const onSubmit = async (data: AccountInput) => {
    try {
      const saved = await saveAccount.mutateAsync({ id: account?.id, input: data });
      reset();
      onOpenChange(false);
      onSuccess?.(saved);
    } catch (error) {
      console.error("Failed to save account:", error);
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
          <DialogTitle>{isEditing ? "Edit account" : "Create account"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business name *</Label>
            <Input
              id="businessName"
              {...register("businessName", {
                required: "Business name is required",
                minLength: {
                  value: 2,
                  message: "Business name must be at least 2 characters",
                },
                validate: (value) => value.trim().length > 0 || "Business name cannot be empty",
              })}
            />
            {errors.businessName && (
              <p className="text-sm text-destructive">
                {errors.businessName.message}
              </p>
            )}
          </div>

          {user?.role === "ADMIN" && <div className="space-y-2">
            <Label htmlFor="ownerId">Account owner *</Label>
            <select id="ownerId" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" {...register("ownerId", { valueAsNumber: true, required: "Owner is required" })}>
              {owners?.map((owner) => <option key={owner.id} value={owner.id}>{owner.firstName} {owner.lastName} ({owner.role === "ADMIN" ? "Administrator" : "Sales representative"})</option>)}
            </select>
            {errors.ownerId && <p className="text-sm text-destructive">{errors.ownerId.message}</p>}
          </div>}

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
            <Label htmlFor="locationAddress">Location address *</Label>
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
            <Label htmlFor="shortHistory">Short history (optional)</Label>
            <Input
              id="shortHistory"
              {...register("shortHistory")}
            />
          </div>

          {saveAccount.error && <p role="alert" className="text-sm text-destructive">{saveAccount.error.message}</p>}

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
                  : "Update account"
                : saveAccount.isPending
                ? "Creating..."
                : "Create account"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
