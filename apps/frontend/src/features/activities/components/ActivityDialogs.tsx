import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useClients } from "@/features/clients/hooks/useClients";
import { useOpportunities } from "@/features/opportunities/hooks/useOpportunities";
import { useSaveFollowUp, useSaveInteraction } from "../hooks/useActivities";
import type { FollowUp, FollowUpInput, Interaction, InteractionInput, InteractionType } from "../services/activitiesApi";

const unlinked = "unlinked";
const interactionTypes: { value: InteractionType; label: string }[] = [
  { value: "CALL", label: "Call" },
  { value: "EMAIL", label: "Email" },
  { value: "MEETING", label: "Meeting" },
  { value: "SITE_VISIT", label: "Site visit" },
  { value: "FOLLOW_UP", label: "Other follow-up" },
];

function toLocalInput(value: string | Date) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function OpportunitySelect({ value, onChange, disabled, opportunities }: { value: string; onChange: (value: string) => void; disabled: boolean; opportunities: { id: number; title: string; stage: string }[] }) {
  return <Select value={value || unlinked} onValueChange={(next) => onChange(next === unlinked ? "" : next)} disabled={disabled}>
    <SelectTrigger id="activity-opportunity"><SelectValue placeholder="No opportunity selected" /></SelectTrigger>
    <SelectContent>
      <SelectItem value={unlinked}>No opportunity — client-level activity</SelectItem>
      {opportunities.map((opportunity) => <SelectItem key={opportunity.id} value={String(opportunity.id)}>{opportunity.title} · {opportunity.stage.toLowerCase().replace("_", " ")}</SelectItem>)}
    </SelectContent>
  </Select>;
}

type Context = { clientId?: number; opportunityId?: number };
type InteractionForm = { clientId: string; opportunityId: string; interactionType: InteractionType; occurredAt: string; notes: string };
type FollowUpForm = { clientId: string; opportunityId: string; title: string; channel: "" | InteractionType; dueAt: string };

export function InteractionDialog({ open, onOpenChange, interaction, clientId, opportunityId }: Context & { open: boolean; onOpenChange: (open: boolean) => void; interaction?: Interaction }) {
  const save = useSaveInteraction();
  const { data: clients } = useClients();
  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } = useForm<InteractionForm>();
  const selectedClientId = Number(watch("clientId"));
  const { data: opportunities } = useOpportunities({ clientId: selectedClientId || undefined });
  const availableOpportunities = useMemo(() => opportunities?.opportunities ?? [], [opportunities]);

  useEffect(() => {
    if (!open) return;
    reset({ clientId: String(interaction?.clientId ?? clientId ?? ""), opportunityId: String(interaction?.opportunityId ?? opportunityId ?? ""), interactionType: interaction?.interactionType ?? "CALL", occurredAt: toLocalInput(interaction?.occurredAt ?? new Date()), notes: interaction?.notes ?? "" });
  }, [clientId, interaction, open, opportunityId, reset]);

  const submit = async (values: InteractionForm) => {
    const input: InteractionInput = { clientId: Number(values.clientId), opportunityId: values.opportunityId ? Number(values.opportunityId) : null, interactionType: values.interactionType, occurredAt: new Date(values.occurredAt).toISOString(), notes: values.notes || null };
    await save.mutateAsync({ id: interaction?.id, input });
    onOpenChange(false);
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-xl">
    <DialogHeader><DialogTitle>{interaction ? "Edit interaction" : "Record interaction"}</DialogTitle><DialogDescription>Record a client touchpoint and optionally link it to a specific sales opportunity.</DialogDescription></DialogHeader>
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(submit)}>
      {!interaction && !clientId && <div className="space-y-2 sm:col-span-2"><Label htmlFor="interaction-client">Client *</Label><Controller name="clientId" control={control} rules={{ required: "Client is required" }} render={({ field }) => <Select value={field.value} onValueChange={(value) => { field.onChange(value); setValue("opportunityId", ""); }}><SelectTrigger id="interaction-client"><SelectValue placeholder="Select client" /></SelectTrigger><SelectContent>{clients?.clients.map((client) => <SelectItem key={client.id} value={String(client.id)}>{client.businessName}</SelectItem>)}</SelectContent></Select>} />{errors.clientId && <p className="text-sm text-destructive">{errors.clientId.message}</p>}</div>}
      {!interaction && !opportunityId && <div className="space-y-2 sm:col-span-2"><Label htmlFor="activity-opportunity">Link to opportunity (optional)</Label><Controller name="opportunityId" control={control} render={({ field }) => <OpportunitySelect value={field.value} onChange={field.onChange} disabled={!selectedClientId} opportunities={availableOpportunities} />} /><p className="text-xs text-muted-foreground">Choose a specific sale, or leave this as a general client interaction.</p></div>}
      <div className="space-y-2"><Label htmlFor="interaction-type">Type *</Label><Controller name="interactionType" control={control} render={({ field }) => <Select value={field.value} onValueChange={field.onChange}><SelectTrigger id="interaction-type"><SelectValue /></SelectTrigger><SelectContent>{interactionTypes.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent></Select>} /></div>
      <div className="space-y-2"><Label htmlFor="interaction-date">Date and time *</Label><Input id="interaction-date" type="datetime-local" {...register("occurredAt", { required: "Date and time are required" })} />{errors.occurredAt && <p className="text-sm text-destructive">{errors.occurredAt.message}</p>}</div>
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="interaction-notes">Notes</Label><Textarea id="interaction-notes" rows={4} maxLength={5000} placeholder="Outcome, next step or useful context" {...register("notes")} /></div>
      {save.error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{save.error.message}</p>}
      <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving..." : "Save interaction"}</Button></div>
    </form>
  </DialogContent></Dialog>;
}

export function FollowUpDialog({ open, onOpenChange, followUp, clientId, opportunityId }: Context & { open: boolean; onOpenChange: (open: boolean) => void; followUp?: FollowUp }) {
  const save = useSaveFollowUp();
  const { data: clients } = useClients();
  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } = useForm<FollowUpForm>();
  const selectedClientId = Number(watch("clientId"));
  const { data: opportunities } = useOpportunities({ clientId: selectedClientId || undefined });

  useEffect(() => {
    if (!open) return;
    const tomorrow = new Date(Date.now() + 86_400_000);
    tomorrow.setHours(9, 0, 0, 0);
    reset({ clientId: String(followUp?.clientId ?? clientId ?? ""), opportunityId: String(followUp?.opportunityId ?? opportunityId ?? ""), title: followUp?.title ?? "", channel: followUp?.channel ?? "", dueAt: toLocalInput(followUp?.dueAt ?? tomorrow) });
  }, [clientId, followUp, open, opportunityId, reset]);

  const submit = async (values: FollowUpForm) => {
    const input: FollowUpInput = { clientId: Number(values.clientId), opportunityId: values.opportunityId ? Number(values.opportunityId) : null, title: values.title, channel: values.channel as InteractionType, dueAt: new Date(values.dueAt).toISOString() };
    await save.mutateAsync({ id: followUp?.id, input });
    onOpenChange(false);
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-xl">
    <DialogHeader><DialogTitle>{followUp ? "Edit follow-up" : "Schedule follow-up"}</DialogTitle><DialogDescription>Assign a dated next action to the client owner.</DialogDescription></DialogHeader>
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(submit)}>
      {!followUp && !clientId && <div className="space-y-2 sm:col-span-2"><Label htmlFor="follow-up-client">Client *</Label><Controller name="clientId" control={control} rules={{ required: "Client is required" }} render={({ field }) => <Select value={field.value} onValueChange={(value) => { field.onChange(value); setValue("opportunityId", ""); }}><SelectTrigger id="follow-up-client"><SelectValue placeholder="Select client" /></SelectTrigger><SelectContent>{clients?.clients.map((client) => <SelectItem key={client.id} value={String(client.id)}>{client.businessName}</SelectItem>)}</SelectContent></Select>} />{errors.clientId && <p className="text-sm text-destructive">{errors.clientId.message}</p>}</div>}
      {!followUp && !opportunityId && <div className="space-y-2 sm:col-span-2"><Label htmlFor="activity-opportunity">Link to opportunity (optional)</Label><Controller name="opportunityId" control={control} render={({ field }) => <OpportunitySelect value={field.value} onChange={field.onChange} disabled={!selectedClientId} opportunities={opportunities?.opportunities ?? []} />} /><p className="text-xs text-muted-foreground">Choose the sale this action supports, or leave it as a general client follow-up.</p></div>}
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="follow-up-title">Next action *</Label><Input id="follow-up-title" maxLength={200} placeholder="Call procurement manager" {...register("title", { required: "Next action is required" })} />{errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}</div>
      <div className="space-y-2"><Label htmlFor="follow-up-channel">Channel *</Label><Controller name="channel" control={control} rules={{ required: "Channel is required" }} render={({ field }) => <Select value={field.value} onValueChange={field.onChange}><SelectTrigger id="follow-up-channel"><SelectValue placeholder="Select channel" /></SelectTrigger><SelectContent>{interactionTypes.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent></Select>} />{errors.channel && <p className="text-sm text-destructive">{errors.channel.message}</p>}</div>
      <div className="space-y-2"><Label htmlFor="follow-up-date">Due date and time *</Label><Input id="follow-up-date" type="datetime-local" {...register("dueAt", { required: "Due date and time are required" })} />{errors.dueAt && <p className="text-sm text-destructive">{errors.dueAt.message}</p>}</div>
      {save.error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{save.error.message}</p>}
      <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving..." : "Save follow-up"}</Button></div>
    </form>
  </DialogContent></Dialog>;
}
