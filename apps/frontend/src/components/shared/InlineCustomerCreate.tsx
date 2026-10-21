import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { X, Plus } from "lucide-react";
import { useCreateCustomer } from "@/features/customers/hooks/useCustomers";
import { useCreateCustomerContact } from "@/features/customers/hooks/useCustomerContacts";
import type { CreateCustomerInput, Customer } from "@/features/customers/types/index";
import type { CreateCustomerContactInput } from "@/types/customerContact";

interface InlineCustomerCreateProps {
  onSuccess: (customer: Customer) => void;
  onCancel: () => void;
  requireContact?: boolean;
}

interface InlineCustomerForm extends CreateCustomerInput {
  contactFirstName?: string;
  contactLastName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export function InlineCustomerCreate({ 
  onSuccess, 
  onCancel,
  requireContact = false 
}: InlineCustomerCreateProps) {
  const createCustomerMutation = useCreateCustomer();
  const createContactMutation = useCreateCustomerContact();
  const [isCreatingContact, setIsCreatingContact] = useState(requireContact);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<InlineCustomerForm>({
    mode: "onBlur",
  });

  const handleCreateCustomer = async () => {
    // Prevent multiple submissions
    if (isSubmitting) return;
    
    // Validate all fields
    const isValid = await trigger();
    if (!isValid) {
      toast.error("Please fill in all required fields correctly.");
      return;
    }
    
    const data = getValues();
    setIsSubmitting(true);
    
    try {
      // Create customer
      const customerData: CreateCustomerInput = {
        companyName: data.companyName,
        countyName: data.countyName,
        locationAddress: data.locationAddress,
        shortHistory: data.shortHistory,
      };

      const createdCustomer = await createCustomerMutation.mutateAsync(customerData);
      
      // If contact data is provided, create contact
      if ((requireContact || isCreatingContact) && data.contactFirstName && data.contactLastName) {
        const contactData: CreateCustomerContactInput = {
          accountId: createdCustomer.id,
          firstName: data.contactFirstName,
          lastName: data.contactLastName,
          email: data.contactEmail || undefined,
          phone: data.contactPhone || undefined,
          isPrimary: true,
        };
        
        await createContactMutation.mutateAsync(contactData);
      }
      
      // Success - call the onSuccess callback
      onSuccess(createdCustomer);
    } catch (error) {
      console.error('Failed to create customer:', error);
      toast.error("Failed to create customer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Quick Add Customer
          </h4>
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

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="inline-companyName" className="text-xs">Company Name *</Label>
              <Input
                id="inline-companyName"
                className="h-8 text-sm"
                {...register("companyName", {
                  required: "Company name is required",
                  minLength: { value: 2, message: "Min 2 characters" },
                  validate: (value) => value.trim().length > 0 || "Cannot be empty",
                })}
              />
              {errors.companyName && (
                <p className="text-xs text-destructive">{errors.companyName.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="inline-countyName" className="text-xs">County *</Label>
              <Input
                id="inline-countyName"
                className="h-8 text-sm"
                {...register("countyName", {
                  required: "County is required",
                  minLength: { value: 2, message: "Min 2 characters" },
                  validate: (value) => value.trim().length > 0 || "Cannot be empty",
                })}
              />
              {errors.countyName && (
                <p className="text-xs text-destructive">{errors.countyName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="inline-locationAddress" className="text-xs">Location Address *</Label>
            <Input
              id="inline-locationAddress"
              className="h-8 text-sm"
              {...register("locationAddress", {
                required: "Location address is required",
                minLength: { value: 3, message: "Min 3 characters" },
                validate: (value) => value.trim().length > 0 || "Cannot be empty",
              })}
            />
            {errors.locationAddress && (
              <p className="text-xs text-destructive">{errors.locationAddress.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="inline-shortHistory" className="text-xs">Short History (Optional)</Label>
            <Input
              id="inline-shortHistory"
              className="h-8 text-sm"
              {...register("shortHistory")}
            />
          </div>

          {/* Contact Section */}
          {!requireContact && !isCreatingContact && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreatingContact(true)}
              className="w-full h-8 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Contact (Optional)
            </Button>
          )}

          {(requireContact || isCreatingContact) && (
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">
                  Contact Information {requireContact && "*"}
                </Label>
                {!requireContact && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCreatingContact(false)}
                    className="h-6 text-xs"
                  >
                    Remove
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="inline-contactFirstName" className="text-xs">
                    First Name {requireContact && "*"}
                  </Label>
                  <Input
                    id="inline-contactFirstName"
                    className="h-8 text-sm"
                    {...register("contactFirstName", {
                      required: requireContact ? "First name is required" : false,
                      minLength: { value: 1, message: "Min 1 character" },
                    })}
                  />
                  {errors.contactFirstName && (
                    <p className="text-xs text-destructive">{errors.contactFirstName.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="inline-contactLastName" className="text-xs">
                    Last Name {requireContact && "*"}
                  </Label>
                  <Input
                    id="inline-contactLastName"
                    className="h-8 text-sm"
                    {...register("contactLastName", {
                      required: requireContact ? "Last name is required" : false,
                      minLength: { value: 1, message: "Min 1 character" },
                    })}
                  />
                  {errors.contactLastName && (
                    <p className="text-xs text-destructive">{errors.contactLastName.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="inline-contactEmail" className="text-xs">
                    Email
                  </Label>
                  <Input
                    id="inline-contactEmail"
                    type="email"
                    className="h-8 text-sm"
                    {...register("contactEmail", {
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address",
                      },
                    })}
                  />
                  {errors.contactEmail && (
                    <p className="text-xs text-destructive">{errors.contactEmail.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="inline-contactPhone" className="text-xs">
                    Phone
                  </Label>
                  <Input
                    id="inline-contactPhone"
                    className="h-8 text-sm"
                    {...register("contactPhone")}
                  />
                  {errors.contactPhone && (
                    <p className="text-xs text-destructive">{errors.contactPhone.message}</p>
                  )}
                </div>
              </div>

            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreateCustomer}
              disabled={isSubmitting}
              className="h-8 text-xs"
            >
              {isSubmitting ? "Creating..." : "Create & Select"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
