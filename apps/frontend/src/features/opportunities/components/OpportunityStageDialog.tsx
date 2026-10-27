import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ConfirmedSaleInput,
  Currency,
  Opportunity,
  OpportunityOutcome,
  OpportunityStage,
} from "../services/opportunitiesApi";
import { opportunityStageLabels } from "../utils/labels";

const stages = Object.keys(opportunityStageLabels) as OpportunityStage[];

export function OpportunityStageDialog({
  opportunity,
  initialStage,
  initialOutcome,
  initialConfirmedSale,
  title = "Change pipeline stage",
  description,
  submitLabel = "Change stage",
  open,
  onOpenChange,
  onSubmit,
  pending,
  error,
}: {
  opportunity: Opportunity | null;
  initialStage?: OpportunityStage;
  initialOutcome?: OpportunityOutcome;
  initialConfirmedSale?: ConfirmedSaleInput;
  title?: string;
  description?: string;
  submitLabel?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    stage: OpportunityStage,
    outcome?: OpportunityOutcome,
    confirmedSale?: ConfirmedSaleInput,
  ) => Promise<void>;
  pending: boolean;
  error: Error | null;
}) {
  const availableStages = useMemo(
    () =>
      opportunity ? stages.slice(stages.indexOf(opportunity.stage) + 1) : [],
    [opportunity],
  );
  const [stage, setStage] = useState<OpportunityStage | "">("");
  const [outcome, setOutcome] = useState<OpportunityOutcome | "">("");
  const [confirmedAmount, setConfirmedAmount] = useState("");
  const [confirmedCurrency, setConfirmedCurrency] = useState<Currency>("KES");

  useEffect(() => {
    if (open) {
      setStage(
        initialStage && availableStages.includes(initialStage)
          ? initialStage
          : (availableStages[0] ?? ""),
      );
      setOutcome(initialOutcome ?? "");
      setConfirmedAmount(initialConfirmedSale?.confirmedAmount ?? "");
      setConfirmedCurrency(
        initialConfirmedSale?.confirmedCurrency ?? opportunity?.currency ?? "KES",
      );
    }
  }, [
    availableStages,
    initialOutcome,
    initialConfirmedSale,
    initialStage,
    open,
    opportunity?.currency,
  ]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (
      !stage ||
      (stage === "CLOSED" && !outcome) ||
      (outcome === "WON" && !confirmedAmount)
    )
      return;
    try {
      await onSubmit(
        stage,
        outcome || undefined,
        outcome === "WON" ? { confirmedAmount, confirmedCurrency } : undefined,
      );
    } catch {
      /* mutation error is displayed below */
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !pending && onOpenChange(nextOpen)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description ??
              `${opportunity?.title}. Stages move forward only and cannot reopen after closure.`}
          </DialogDescription>
        </DialogHeader>
        <form className="mt-4 space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="nextStage">Next stage</Label>
            <Select
              value={stage}
              onValueChange={(value) => {
                setStage(value as OpportunityStage);
                setOutcome("");
              }}
            >
              <SelectTrigger id="nextStage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableStages.map((value) => (
                  <SelectItem key={value} value={value}>
                    {opportunityStageLabels[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {stage === "CLOSED" && (
            <div className="space-y-2">
              <Label htmlFor="outcome">Outcome *</Label>
              <Select
                value={outcome}
                onValueChange={(value) =>
                  setOutcome(value as OpportunityOutcome)
                }
              >
                <SelectTrigger id="outcome">
                  <SelectValue placeholder="Select Won or Lost" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WON">Won</SelectItem>
                  <SelectItem value="LOST">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {stage === "CLOSED" && outcome === "WON" && (
            <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
              <div className="space-y-2">
                <Label htmlFor="confirmedAmount">Confirmed sale value *</Label>
                <Input
                  id="confirmedAmount"
                  inputMode="decimal"
                  placeholder="Actual agreed value"
                  value={confirmedAmount}
                  onChange={(event) => setConfirmedAmount(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmedCurrency">Currency *</Label>
                <Select
                  value={confirmedCurrency}
                  onValueChange={(value) =>
                    setConfirmedCurrency(value as Currency)
                  }
                >
                  <SelectTrigger id="confirmedCurrency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KES">KES</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Confirm or edit the actual agreed sale value before marking the
                opportunity Won.
              </p>
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                pending ||
                !stage ||
                (stage === "CLOSED" && !outcome) ||
                (outcome === "WON" && !confirmedAmount)
              }
            >
              {pending ? "Updating..." : submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
