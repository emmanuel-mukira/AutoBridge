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
  DialogFooter,
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
import { useCreateCallPlan } from "../hooks/useCallPlanner";
import { useCustomers } from "@/features/customers/hooks/useCustomers";
import type { CreateCallPlanInput, CallPurpose, CallLocationType, ProductLine } from "../types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const CALL_PURPOSES: { value: CallPurpose; label: string }[] = [
  { value: "Prospective", label: "Prospective" },
  { value: "Selling", label: "Selling" },
  { value: "Coverage", label: "Coverage" },
  { value: "Collection", label: "Collection" },
  { value: "Complaint", label: "Complaint" },
];

const LOCATION_TYPES: { value: CallLocationType; label: string }[] = [
  { value: "Customer_Office", label: "Customer Office" },
  { value: "Customer_Site", label: "Customer Site" },
  { value: "Hotel", label: "Hotel" },
  { value: "Dealer_Branch", label: "Dealer Branch" },
];

const PRODUCT_LINES: { value: ProductLine; label: string }[] = [
  { value: "Parts", label: "Parts" },
  { value: "Electrical", label: "Electrical" },
  { value: "Hardware", label: "Hardware" },
  { value: "Generator", label: "Generator" },
  { value: "Small_Workers", label: "Small Workers" },
];

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface CreateCallPlanWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCallPlanWizard({ open, onOpenChange }: CreateCallPlanWizardProps) {
  const { user } = useAuth();
  const createMutation = useCreateCallPlan();
  const { data: customersData } = useCustomers();
  const [currentStep, setCurrentStep] = useState(1);
  const [dateErrors, setDateErrors] = useState<{ weekBeginning?: string; plannedDate?: string }>({});
  const [showInlineCustomerCreate, setShowInlineCustomerCreate] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    trigger,
  } = useForm<CreateCallPlanInput>({
    defaultValues: {
      salesRepId: user?.id,
      purpose: "Prospective",
      locationType: "Customer_Office",
      productLine: "Generator",
      dayOfWeek: "Monday",
    },
  });

  const purpose = watch("purpose");
  const locationType = watch("locationType");
  const productLine = watch("productLine");
  const customerId = watch("customerId");
  const dayOfWeek = watch("dayOfWeek");
  const weekBeginning = watch("weekBeginning");
  const plannedDate = watch("plannedDate");

  const customers = customersData?.customers || [];

  const getCurrentOrNextMonday = (): string => {
    const today = new Date();
    const day = today.getDay();
    
    let daysToMonday: number;
    if (day === 0) {
      daysToMonday = -6;
    } else if (day === 1) {
      daysToMonday = 0;
    } else {
      daysToMonday = -(day - 1);
    }
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + daysToMonday);
    return monday.toISOString().split('T')[0];
  };

  const getTodayDate = (): string => {
    return new Date().toISOString().split('T')[0];
  };

  const minWeekBeginning = getCurrentOrNextMonday();
  const minPlannedDate = getTodayDate();

  const validateDates = (weekBeginning: string, plannedDate: string): boolean => {
    const errors: { weekBeginning?: string; plannedDate?: string } = {};
    const weekStart = new Date(weekBeginning);
    const planned = new Date(plannedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (weekStart.getDay() !== 1) {
      errors.weekBeginning = "Week beginning must be a Monday";
    }

    if (planned < today) {
      errors.plannedDate = "Planned date cannot be in the past";
    }

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4);

    if (planned < weekStart || planned > weekEnd) {
      errors.plannedDate = errors.plannedDate || "Planned date must be within the week (Monday to Friday)";
    }

    setDateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onSubmit = async (data: CreateCallPlanInput) => {
    try {
      const isValid = validateDates(data.weekBeginning, data.plannedDate);
      if (!isValid) {
        toast.warning("Please fix the validation errors", {
          description: "Check the highlighted fields and try again.",
        });
        return;
      }

      const payload: CreateCallPlanInput = {
        ...data,
        weekBeginning: new Date(data.weekBeginning).toISOString(),
        plannedDate: new Date(data.plannedDate).toISOString(),
      };
      await createMutation.mutateAsync(payload);
      reset();
      setCurrentStep(1);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create call plan:', error);
    }
  };

  const handleClose = () => {
    reset();
    setDateErrors({});
    setShowInlineCustomerCreate(false);
    setCurrentStep(1);
    onOpenChange(false);
  };

  const handleCustomerCreated = (customer: Customer) => {
    setValue("customerId", customer.id, { shouldValidate: true });
    setShowInlineCustomerCreate(false);
    toast.success("Customer created successfully");
  };

  const handleNext = async () => {
    let isValid = false;
    
    if (currentStep === 1) {
      isValid = await trigger(["customerId", "plannedDate", "weekBeginning", "dayOfWeek"]);
      if (isValid && weekBeginning && plannedDate) {
        isValid = validateDates(weekBeginning, plannedDate);
      }
    } else if (currentStep === 2) {
      isValid = await trigger(["purpose", "locationType", "exactLocation"]);
    }
    
    if (isValid) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Call Plan - Step {currentStep} of {totalSteps}</DialogTitle>
          <DialogDescription>
            {currentStep === 1 && "Select customer and schedule"}
            {currentStep === 2 && "Set purpose and location details"}
            {currentStep === 3 && "Add product information (optional)"}
          </DialogDescription>
          <Progress value={progress} className="mt-2" />
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {currentStep === 1 && (
            <div className="space-y-4">
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
                  <Select
                    value={customerId?.toString()}
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
                <Label htmlFor="plannedDate">Planned Date *</Label>
                <div 
                  className="relative"
                  onClick={(e) => {
                    const input = e.currentTarget.querySelector('input');
                    if (input) {
                      input.focus();
                      input.showPicker?.();
                    }
                  }}
                >
                  <Input
                    id="plannedDate"
                    type="date"
                    min={minPlannedDate}
                    className={dateErrors.plannedDate ? "border-red-500 cursor-pointer" : "cursor-pointer"}
                    onFocus={(e) => {
                      try {
                        e.target.showPicker?.();
                      } catch {
                        // Fallback for browsers that don't support showPicker
                      }
                    }}
                    {...register("plannedDate", { required: true })}
                  />
                </div>
                {dateErrors.plannedDate && (
                  <p className="text-sm text-red-600 dark:text-red-400">{dateErrors.plannedDate}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="weekBeginning">Week Beginning (Monday) *</Label>
                <div 
                  className="relative"
                  onClick={(e) => {
                    const input = e.currentTarget.querySelector('input');
                    if (input) {
                      input.focus();
                      input.showPicker?.();
                    }
                  }}
                >
                  <Input
                    id="weekBeginning"
                    type="date"
                    min={minWeekBeginning}
                    className={dateErrors.weekBeginning ? "border-red-500 cursor-pointer" : "cursor-pointer"}
                    onFocus={(e) => {
                      try {
                        e.target.showPicker?.();
                      } catch {
                        // Fallback for browsers that don't support showPicker
                      }
                    }}
                    {...register("weekBeginning", { required: true })}
                  />
                </div>
                {dateErrors.weekBeginning ? (
                  <p className="text-sm text-red-600 dark:text-red-400">{dateErrors.weekBeginning}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Must be a Monday</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dayOfWeek">Day of Week *</Label>
                <Select
                  value={dayOfWeek}
                  onValueChange={(value: string) => setValue("dayOfWeek", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose *</Label>
                <Select
                  value={purpose}
                  onValueChange={(value: string) => setValue("purpose", value as CallPurpose)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CALL_PURPOSES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationType">Location Type *</Label>
                <Select
                  value={locationType}
                  onValueChange={(value: string) => setValue("locationType", value as CallLocationType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_TYPES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="exactLocation">Exact Location *</Label>
                <Input
                  id="exactLocation"
                  {...register("exactLocation", { required: true })}
                  placeholder="Enter exact location"
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="productLine">Product Line *</Label>
                <Select
                  value={productLine}
                  onValueChange={(value: string) => setValue("productLine", value as ProductLine)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_LINES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="proposedGenerator">Proposed Generator</Label>
                <Input
                  id="proposedGenerator"
                  {...register("proposedGenerator")}
                  placeholder="Optional - specify generator model"
                />
                <p className="text-xs text-muted-foreground">Leave blank if not applicable</p>
              </div>
            </div>
          )}

          <DialogFooter>
            {currentStep > 1 && (
              <Button type="button" variant="outline" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            {currentStep === 1 && (
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            )}
            {currentStep < totalSteps ? (
              <Button type="button" onClick={handleNext} disabled={!customerId && currentStep === 1}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
