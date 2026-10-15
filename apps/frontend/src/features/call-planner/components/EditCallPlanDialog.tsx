import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useCallPlan, useUpdateCallPlan } from "../hooks/useCallPlanner";
import type { UpdateCallPlanInput, CallPurpose, CallLocationType, ProductLine } from "../types";

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

interface EditCallPlanDialogProps {
  callPlanId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCallPlanDialog({ callPlanId, open, onOpenChange }: EditCallPlanDialogProps) {
  const { data: callPlan, isLoading } = useCallPlan(callPlanId);
  const updateMutation = useUpdateCallPlan();
  const [dateErrors, setDateErrors] = useState<{ weekBeginning?: string; plannedDate?: string }>({});

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
  } = useForm<UpdateCallPlanInput>();

  const purpose = watch("purpose");
  const locationType = watch("locationType");
  const productLine = watch("productLine");
  const dayOfWeek = watch("dayOfWeek");

  useEffect(() => {
    if (callPlan) {
      reset({
        purpose: callPlan.purpose,
        locationType: callPlan.locationType,
        exactLocation: callPlan.exactLocation,
        productLine: callPlan.productLine,
        proposedGenerator: callPlan.proposedGenerator || undefined,
        dayOfWeek: callPlan.dayOfWeek,
        plannedDate: callPlan.plannedDate.split('T')[0],
        weekBeginning: callPlan.weekBeginning.split('T')[0],
      });
    }
  }, [callPlan, reset]);

  // Get the Monday of current week (if week hasn't ended) or next Monday
  const getCurrentOrNextMonday = (): string => {
    const today = new Date();
    const day = today.getDay();
    
    // If it's Monday (1) through Sunday (0), get this week's Monday
    // Week ends when next Monday arrives
    let daysToMonday: number;
    if (day === 0) {
      // Sunday - go back 6 days to get this week's Monday
      daysToMonday = -6;
    } else if (day === 1) {
      // Monday - use today
      daysToMonday = 0;
    } else {
      // Tuesday-Saturday - go back to this week's Monday
      daysToMonday = -(day - 1);
    }
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + daysToMonday);
    return monday.toISOString().split('T')[0];
  };

  // Get today's date for planned date minimum
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

  const onSubmit = async (data: UpdateCallPlanInput) => {
    try {
      if (data.weekBeginning && data.plannedDate) {
        const isValid = validateDates(data.weekBeginning, data.plannedDate);
        if (!isValid) {
          toast.warning("Please fix the validation errors", {
            description: "Check the highlighted fields and try again.",
          });
          return;
        }
      }

      const payload: UpdateCallPlanInput = {
        ...data,
        weekBeginning: data.weekBeginning ? new Date(data.weekBeginning).toISOString() : undefined,
        plannedDate: data.plannedDate ? new Date(data.plannedDate).toISOString() : undefined,
      };
      await updateMutation.mutateAsync({ id: callPlanId, data: payload });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update call plan:', error);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Call Plan</DialogTitle>
          <DialogDescription>
            Update the call plan details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plannedDate">Planned Date</Label>
              <Input
                id="plannedDate"
                type="date"
                min={minPlannedDate}
                className={dateErrors.plannedDate ? "border-red-500" : ""}
                {...register("plannedDate")}
              />
              {dateErrors.plannedDate && (
                <p className="text-sm text-red-600 dark:text-red-400">{dateErrors.plannedDate}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="weekBeginning">Week Beginning (Monday)</Label>
              <Input
                id="weekBeginning"
                type="date"
                min={minWeekBeginning}
                className={dateErrors.weekBeginning ? "border-red-500" : ""}
                {...register("weekBeginning")}
              />
              {dateErrors.weekBeginning ? (
                <p className="text-sm text-red-600 dark:text-red-400">{dateErrors.weekBeginning}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Must be a Monday</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dayOfWeek">Day of Week</Label>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose</Label>
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
              <Label htmlFor="locationType">Location Type</Label>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="exactLocation">Exact Location</Label>
            <Input
              id="exactLocation"
              {...register("exactLocation")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="productLine">Product Line</Label>
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
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Call Plan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
