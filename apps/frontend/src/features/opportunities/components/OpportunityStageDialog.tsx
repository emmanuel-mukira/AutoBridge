import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Opportunity, OpportunityOutcome, OpportunityStage } from "../services/opportunitiesApi";
import { opportunityStageLabels } from "../utils/labels";

const stages = Object.keys(opportunityStageLabels) as OpportunityStage[];

export function OpportunityStageDialog({ opportunity, initialStage, open, onOpenChange, onSubmit, pending, error }: {
  opportunity: Opportunity | null;
  initialStage?: OpportunityStage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (stage: OpportunityStage, outcome?: OpportunityOutcome) => Promise<void>;
  pending: boolean;
  error: Error | null;
}) {
  const availableStages = useMemo(() => opportunity ? stages.slice(stages.indexOf(opportunity.stage) + 1) : [], [opportunity]);
  const [stage, setStage] = useState<OpportunityStage | "">("");
  const [outcome, setOutcome] = useState<OpportunityOutcome | "">("");

  useEffect(() => {
    if (open) {
      setStage(initialStage && availableStages.includes(initialStage) ? initialStage : availableStages[0] ?? "");
      setOutcome("");
    }
  }, [availableStages, initialStage, open]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!stage || (stage === "CLOSED" && !outcome)) return;
    try { await onSubmit(stage, outcome || undefined); } catch { /* mutation error is displayed below */ }
  };

  return <Dialog open={open} onOpenChange={(nextOpen) => !pending && onOpenChange(nextOpen)}>
    <DialogContent>
      <DialogHeader><DialogTitle>Change pipeline stage</DialogTitle><DialogDescription>{opportunity?.title}. Stages move forward only and cannot reopen after closure.</DialogDescription></DialogHeader>
      <form className="mt-4 space-y-4" onSubmit={submit}>
        <div className="space-y-2"><Label htmlFor="nextStage">Next stage</Label><Select value={stage} onValueChange={(value) => { setStage(value as OpportunityStage); setOutcome(""); }}><SelectTrigger id="nextStage"><SelectValue /></SelectTrigger><SelectContent>{availableStages.map((value) => <SelectItem key={value} value={value}>{opportunityStageLabels[value]}</SelectItem>)}</SelectContent></Select></div>
        {stage === "CLOSED" && <div className="space-y-2"><Label htmlFor="outcome">Outcome *</Label><Select value={outcome} onValueChange={(value) => setOutcome(value as OpportunityOutcome)}><SelectTrigger id="outcome"><SelectValue placeholder="Select Won or Lost" /></SelectTrigger><SelectContent><SelectItem value="WON">Won</SelectItem><SelectItem value="LOST">Lost</SelectItem></SelectContent></Select></div>}
        {error && <p role="alert" className="text-sm text-destructive">{error.message}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button><Button type="submit" disabled={pending || !stage || (stage === "CLOSED" && !outcome)}>{pending ? "Updating..." : "Change stage"}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
