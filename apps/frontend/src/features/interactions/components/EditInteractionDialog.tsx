import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import * as React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useInteraction, useUpdateInteraction } from "../hooks/useInteractions";
import type { UpdateInteractionInput, InteractionType } from "../types";

const INTERACTION_TYPES: { value: InteractionType; label: string }[] = [
  { value: "CALL", label: "Call" },
  { value: "EMAIL", label: "Email" },
  { value: "MEETING", label: "Meeting" },
  { value: "SITE_VISIT", label: "Site Visit" },
  { value: "FOLLOW_UP", label: "Follow Up" },
];

interface EditInteractionDialogProps {
  interactionId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditInteractionDialog({ interactionId, open, onOpenChange }: EditInteractionDialogProps) {
  const { data: interaction, isLoading } = useInteraction(interactionId);
  const updateMutation = useUpdateInteraction();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
  } = useForm<UpdateInteractionInput>();

  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>();

  const type = watch("type");

  useEffect(() => {
    if (interaction) {
      const date = new Date(interaction.interactionDate);
      setSelectedDate(date);
      reset({
        type: interaction.type,
        interactionDate: interaction.interactionDate.split('T')[0],
        notes: interaction.notes,
      });
    }
  }, [interaction, reset]);

  const onSubmit = async (data: UpdateInteractionInput) => {
    try {
      const payload: UpdateInteractionInput = {
        ...data,
        interactionDate: data.interactionDate ? new Date(data.interactionDate).toISOString() : undefined,
      };
      await updateMutation.mutateAsync({ id: interactionId, data: payload });
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Interaction</DialogTitle>
          <DialogDescription>
            Update the interaction details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
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
              <Label htmlFor="interactionDate">Interaction Date</Label>
              <DatePicker
                date={selectedDate}
                onDateChange={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setValue("interactionDate", date.toISOString().split('T')[0]);
                  }
                }}
                placeholder="Select interaction date"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              rows={5}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Interaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
