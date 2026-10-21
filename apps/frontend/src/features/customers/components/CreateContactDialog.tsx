import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  useCreateCustomerContact,
  useUpdateCustomerContact,
} from "../hooks/useCustomerContacts";
import type { CreateCustomerContactInput, CustomerContact } from "@/types/customerContact";

interface CreateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: number;
  customerName: string;
  contact?: CustomerContact | null;
}

export function CreateContactDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  contact,
}: CreateContactDialogProps) {
  const createContactMutation = useCreateCustomerContact();
  const updateContactMutation = useUpdateCustomerContact();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateCustomerContactInput>({
    defaultValues: {
      accountId: customerId,
      isPrimary: false,
    },
  });

  const isPrimary = watch("isPrimary");

  useEffect(() => {
    if (open) {
      if (contact) {
        setValue("firstName", contact.firstName);
        setValue("lastName", contact.lastName);
        setValue("title", contact.title || "");
        setValue("email", contact.email || "");
        setValue("phone", contact.phone || "");
        setValue("isPrimary", contact.isPrimary);
      } else {
        reset({
          accountId: customerId,
          isPrimary: false,
        });
      }
    }
  }, [open, contact, customerId, reset, setValue]);

  const onSubmit = async (data: CreateCustomerContactInput) => {
    try {
      if (contact) {
        await updateContactMutation.mutateAsync({
          id: contact.id,
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            title: data.title,
            email: data.email,
            phone: data.phone,
            isPrimary: data.isPrimary,
          },
        });
      } else {
        await createContactMutation.mutateAsync(data);
      }
      handleClose();
    } catch (error) {
      console.error("Failed to save contact:", error);
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{contact ? "Edit Contact" : "Add Contact"}</DialogTitle>
          <DialogDescription>
            {contact ? "Update contact information" : `Add a new contact for ${customerName}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  {...register("firstName", { required: "First name is required" })}
                />
                {errors.firstName && (
                  <p className="text-sm text-destructive">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  {...register("lastName", { required: "Last name is required" })}
                />
                {errors.lastName && (
                  <p className="text-sm text-destructive">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., Operations Manager"
                {...register("title")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="contact@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+254 700 000 000"
                {...register("phone")}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPrimary"
                checked={isPrimary}
                onCheckedChange={(checked: boolean) => setValue("isPrimary", checked)}
              />
              <Label
                htmlFor="isPrimary"
                className="text-sm font-normal cursor-pointer"
              >
                Set as primary contact
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createContactMutation.isPending || updateContactMutation.isPending}
            >
              {createContactMutation.isPending || updateContactMutation.isPending
                ? "Saving..."
                : contact
                ? "Update Contact"
                : "Add Contact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
