import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { useCreateCustomerContact } from "@/features/customers/hooks/useCustomerContacts";
import type { CustomerContact } from "@/types/customerContact";

interface InlineContactCreateProps {
  customerId: number;
  onSuccess: (contact: CustomerContact) => void;
  onCancel: () => void;
}

interface ContactFormData {
  firstName: string;
  lastName: string;
  title?: string;
  email?: string;
  phone?: string;
}

export function InlineContactCreate({ customerId, onSuccess, onCancel }: InlineContactCreateProps) {
  const createMutation = useCreateCustomerContact();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormData>();

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      const contact = await createMutation.mutateAsync({
        accountId: customerId,
        ...data,
      });
      onSuccess(contact);
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border rounded-md p-3 bg-muted/50 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Add New Contact</h4>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="firstName" className="text-xs">
              First Name *
            </Label>
            <Input
              id="firstName"
              {...register("firstName", { required: true })}
              className="h-8 text-sm"
              placeholder="John"
            />
            {errors.firstName && (
              <p className="text-xs text-destructive">Required</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="lastName" className="text-xs">
              Last Name *
            </Label>
            <Input
              id="lastName"
              {...register("lastName", { required: true })}
              className="h-8 text-sm"
              placeholder="Doe"
            />
            {errors.lastName && (
              <p className="text-xs text-destructive">Required</p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="title" className="text-xs">
            Title
          </Label>
          <Input
            id="title"
            {...register("title")}
            className="h-8 text-sm"
            placeholder="Sales Manager"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="email" className="text-xs">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              className="h-8 text-sm"
              placeholder="john@example.com"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="phone" className="text-xs">
              Phone
            </Label>
            <Input
              id="phone"
              {...register("phone")}
              className="h-8 text-sm"
              placeholder="+254..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="h-7 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="h-7 text-xs"
          >
            {isSubmitting ? "Adding..." : "Add Contact"}
          </Button>
        </div>
      </form>
    </div>
  );
}
