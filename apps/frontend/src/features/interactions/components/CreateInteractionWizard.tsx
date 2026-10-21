import { useState } from "react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { InlineCustomerCreate } from "@/components/shared/InlineCustomerCreate";
import { InlineContactCreate } from "@/components/shared/InlineContactCreate";
import type { Customer } from "@/features/customers/types/index";
import type { CustomerContact } from "@/types/customerContact";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
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
import { useCustomerContacts } from "@/features/customers/hooks/useCustomerContacts";
import type { CreateInteractionInput, InteractionType } from "../types";
import { ChevronLeft, ChevronRight } from "lucide-react";

const INTERACTION_TYPES: { value: InteractionType; label: string }[] = [
  { value: "CALL", label: "Call" },
  { value: "EMAIL", label: "Email" },
  { value: "MEETING", label: "Meeting" },
  { value: "SITE_VISIT", label: "Site Visit" },
  { value: "FOLLOW_UP", label: "Follow Up" },
];

interface CreateInteractionWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type WizardStep = "customer" | "details" | "notes";

export function CreateInteractionWizard({ open, onOpenChange }: CreateInteractionWizardProps) {
  const { user } = useAuth();
  const createMutation = useCreateInteraction();
  const { data: customersData } = useCustomers();
  const [currentStep, setCurrentStep] = useState<WizardStep>("customer");
  const [showInlineCustomerCreate, setShowInlineCustomerCreate] = useState(false);
  const [showInlineContactCreate, setShowInlineContactCreate] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateInteractionInput>({
    defaultValues: {
      salesRepId: user?.id,
      type: "MEETING",
      interactionDate: new Date().toISOString().split('T')[0],
    },
  });

  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());

  const customerId = watch("customerId");
  const contactId = watch("contactId");
  const type = watch("type");
  const interactionDate = watch("interactionDate");
  const notes = watch("notes");

  const customers = customersData?.customers || [];
  const { data: contactsData } = useCustomerContacts(customerId ? { accountId: customerId } : undefined);
  const contacts = contactsData?.contacts || [];

  const onSubmit = async (data: CreateInteractionInput) => {
    const payload: CreateInteractionInput = {
      ...data,
      interactionDate: data.interactionDate ? new Date(data.interactionDate).toISOString() : undefined,
    };
    await createMutation.mutateAsync(payload);
    reset();
    setCurrentStep("customer");
    onOpenChange(false);
  };

  const handleClose = () => {
    reset();
    setCurrentStep("customer");
    setShowInlineCustomerCreate(false);
    onOpenChange(false);
  };

  const handleCustomerCreated = (customer: Customer) => {
    setValue("customerId", customer.id, { shouldValidate: true });
    setShowInlineCustomerCreate(false);
  };

  const handleContactCreated = (contact: CustomerContact) => {
    setValue("contactId", contact.id, { shouldValidate: true });
    setShowInlineContactCreate(false);
  };

  const canProceedToDetails = customerId && contactId;
  const canProceedToNotes = type && interactionDate;

  const handleNext = () => {
    if (currentStep === "customer" && canProceedToDetails) {
      setCurrentStep("details");
    } else if (currentStep === "details" && canProceedToNotes) {
      setCurrentStep("notes");
    }
  };

  const handleBack = () => {
    if (currentStep === "notes") {
      setCurrentStep("details");
    } else if (currentStep === "details") {
      setCurrentStep("customer");
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case "customer":
        return "Select Customer & Contact";
      case "details":
        return "Interaction Details";
      case "notes":
        return "Add Notes";
      default:
        return "Create Interaction";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case "customer":
        return "Choose the customer and contact person for this interaction";
      case "details":
        return "Specify the type and date of the interaction";
      case "notes":
        return "Add detailed notes about the interaction";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{getStepTitle()}</DialogTitle>
          <DialogDescription>{getStepDescription()}</DialogDescription>
          
          <div className="flex items-center gap-2 pt-4">
            <div className={`h-2 flex-1 rounded-full ${currentStep === "customer" ? "bg-primary" : "bg-muted"}`} />
            <div className={`h-2 flex-1 rounded-full ${currentStep === "details" ? "bg-primary" : "bg-muted"}`} />
            <div className={`h-2 flex-1 rounded-full ${currentStep === "notes" ? "bg-primary" : "bg-muted"}`} />
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {currentStep === "customer" && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="customerId">Customer *</Label>
                    {!showInlineCustomerCreate && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowInlineCustomerCreate(true)}
                        className="h-7 text-xs"
                      >
                        + New Customer
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
                      onValueChange={(value: string) => {
                        setValue("customerId", Number(value), { shouldValidate: true });
                        setValue("contactId", undefined);
                      }}
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

                {customerId && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="contactId">Contact Person *</Label>
                      {!showInlineContactCreate && contacts.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowInlineContactCreate(true)}
                          className="h-7 text-xs"
                        >
                          + New Contact
                        </Button>
                      )}
                    </div>
                    
                    {showInlineContactCreate ? (
                      <InlineContactCreate
                        customerId={customerId}
                        onSuccess={handleContactCreated}
                        onCancel={() => setShowInlineContactCreate(false)}
                      />
                    ) : contacts.length > 0 ? (
                      <Select
                        value={contactId?.toString() || ""}
                        onValueChange={(value: string) => setValue("contactId", Number(value), { shouldValidate: true })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select contact" />
                        </SelectTrigger>
                        <SelectContent>
                          {contacts.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id.toString()}>
                              {contact.firstName} {contact.lastName}
                              {contact.title && ` - ${contact.title}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                          No contacts found for this customer.
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowInlineContactCreate(true)}
                          className="w-full"
                        >
                          + Add First Contact
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {currentStep === "details" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="type">Interaction Type *</Label>
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
              </>
            )}

            {currentStep === "notes" && (
              <div className="space-y-2">
                <Label htmlFor="notes">Notes *</Label>
                <Textarea
                  id="notes"
                  {...register("notes", { required: true })}
                  placeholder="Enter detailed notes about the interaction..."
                  rows={10}
                  className="resize-none"
                />
                {errors.notes && (
                  <p className="text-sm text-destructive">Notes are required</p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between gap-2 pt-4 border-t flex-shrink-0 mt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={currentStep === "customer" ? handleClose : handleBack}
            >
              {currentStep === "customer" ? (
                "Cancel"
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </>
              )}
            </Button>

            {currentStep !== "notes" ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={
                  (currentStep === "customer" && !canProceedToDetails) ||
                  (currentStep === "details" && !canProceedToNotes)
                }
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button 
                type="submit" 
                disabled={createMutation.isPending || !notes}
              >
                {createMutation.isPending ? "Creating..." : "Create Interaction"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
