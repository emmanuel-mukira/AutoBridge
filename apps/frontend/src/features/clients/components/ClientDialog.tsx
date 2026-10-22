import { Controller, useForm } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSaveClient } from "../hooks/useClients";
import { useClientOwners } from "../hooks/useClients";
import { useAuth } from "@/app/auth/useAuth";
import type { Client, ClientInput } from "../services/clientsApi";

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (client: Client) => void;
  client?: Client;
}

export function ClientDialog({
  open,
  onOpenChange,
  onSuccess,
  client,
}: ClientDialogProps) {
  const saveClient = useSaveClient();
  const { user } = useAuth();
  const { data: owners } = useClientOwners();
  const isEditing = !!client;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<ClientInput>({
    mode: "onBlur",
  });

  useEffect(() => {
    if (client) {
      setValue("businessName", client.businessName);
      setValue("countyName", client.countyName);
      setValue("locationAddress", client.locationAddress);
      setValue("shortHistory", client.shortHistory || "");
      setValue("ownerId", client.ownerId);
    } else if (user) {
      setValue("ownerId", user.id);
    }
  }, [client, setValue, user]);

  const onSubmit = async (data: ClientInput) => {
    try {
      const saved = await saveClient.mutateAsync({ id: client?.id, input: data });
      reset();
      onOpenChange(false);
      onSuccess?.(saved);
    } catch (error) {
      console.error("Failed to save client:", error);
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
          <DialogTitle>{isEditing ? "Edit client" : "Create client"}</DialogTitle>
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
            <Label htmlFor="ownerId">Client owner *</Label>
            <Controller name="ownerId" control={control} rules={{ required: "Owner is required" }} render={({ field }) => <Select value={field.value ? String(field.value) : ""} onValueChange={(value) => field.onChange(Number(value))}><SelectTrigger id="ownerId"><SelectValue placeholder="Select owner" /></SelectTrigger><SelectContent>{owners?.map((owner) => <SelectItem key={owner.id} value={String(owner.id)}>{owner.firstName} {owner.lastName} ({owner.role === "ADMIN" ? "Administrator" : "Sales representative"})</SelectItem>)}</SelectContent></Select>} />
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

          {saveClient.error && <p role="alert" className="text-sm text-destructive">{saveClient.error.message}</p>}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={
                saveClient.isPending ||
                Object.keys(errors).length > 0
              }
            >
              {isEditing
                ? saveClient.isPending
                  ? "Updating..."
                  : "Update client"
                : saveClient.isPending
                ? "Creating..."
                : "Create client"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
