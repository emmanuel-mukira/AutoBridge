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
import { useFollowUpAvailability, useSaveFollowUp, useSaveInteraction } from "../hooks/useActivities";
import type { FollowUp, FollowUpInput, Interaction, InteractionInput, InteractionType } from "../services/activitiesApi";

const interactionTypes: { value: InteractionType; label: string }[] = [
  { value: "CALL", label: "Call" },
  { value: "EMAIL", label: "Email" },
  { value: "MEETING", label: "Meeting" },
  { value: "SITE_VISIT", label: "Site visit" },
  { value: "FOLLOW_UP", label: "Other follow-up" },
];
const defaultMinutes: Record<InteractionType, number> = { EMAIL: 15, CALL: 30, MEETING: 60, SITE_VISIT: 120, FOLLOW_UP: 30 };

function toLocalInput(value: string | Date) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function OpportunitySelect({ value, onChange, disabled, opportunities }: { value: string; onChange: (value: string) => void; disabled: boolean; opportunities: { id: number; title: string; stage: string }[] }) {
  return <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
    <SelectTrigger id="activity-opportunity"><SelectValue placeholder="Select opportunity" /></SelectTrigger>
    <SelectContent>
      {opportunities.map((opportunity) => <SelectItem key={opportunity.id} value={String(opportunity.id)}>{opportunity.title} · {opportunity.stage.toLowerCase().replace("_", " ")}</SelectItem>)}
    </SelectContent>
  </Select>;
}

type Context = { clientId?: number; opportunityId?: number };
type InteractionForm = { clientId: string; opportunityId: string; interactionType: InteractionType; occurredAt: string; notes: string };
type FollowUpForm = { clientId: string; opportunityId: string; title: string; channel: "" | InteractionType; dueAt: string; estimatedMinutes: string; appointmentConfirmed: boolean };

export function InteractionDialog({ open, onOpenChange, interaction, clientId, opportunityId }: Context & { open: boolean; onOpenChange: (open: boolean) => void; interaction?: Interaction }) {
  const save = useSaveInteraction();
  const { data: clients } = useClients();
  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } = useForm<InteractionForm>();
  const selectedClientId = Number(watch("clientId"));
  const { data: opportunities } = useOpportunities({ clientId: selectedClientId || undefined, limit: 100 });
  const availableOpportunities = useMemo(() => opportunities?.opportunities ?? [], [opportunities]);

  useEffect(() => {
    if (!open) return;
    reset({ clientId: String(interaction?.clientId ?? clientId ?? ""), opportunityId: String(interaction?.opportunityId ?? opportunityId ?? ""), interactionType: interaction?.interactionType ?? "CALL", occurredAt: toLocalInput(interaction?.occurredAt ?? new Date()), notes: interaction?.notes ?? "" });
  }, [clientId, interaction, open, opportunityId, reset]);

  const submit = async (values: InteractionForm) => {
    const input: InteractionInput = { clientId: Number(values.clientId), opportunityId: Number(values.opportunityId), interactionType: values.interactionType, occurredAt: new Date(values.occurredAt).toISOString(), notes: values.notes || null };
    await save.mutateAsync({ id: interaction?.id, input });
    onOpenChange(false);
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-xl">
    <DialogHeader><DialogTitle>{interaction ? "Edit interaction" : "Record interaction"}</DialogTitle><DialogDescription>Record a client touchpoint against the sales opportunity it supports.</DialogDescription></DialogHeader>
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(submit)}>
      {!interaction && !clientId && <div className="space-y-2 sm:col-span-2"><Label htmlFor="interaction-client">Client *</Label><Controller name="clientId" control={control} rules={{ required: "Client is required" }} render={({ field }) => <Select value={field.value} onValueChange={(value) => { field.onChange(value); setValue("opportunityId", ""); }}><SelectTrigger id="interaction-client"><SelectValue placeholder="Select client" /></SelectTrigger><SelectContent>{clients?.clients.map((client) => <SelectItem key={client.id} value={String(client.id)}>{client.businessName}</SelectItem>)}</SelectContent></Select>} />{errors.clientId && <p className="text-sm text-destructive">{errors.clientId.message}</p>}</div>}
      {!opportunityId && <div className="space-y-2 sm:col-span-2"><Label htmlFor="activity-opportunity">Opportunity *</Label><Controller name="opportunityId" control={control} rules={{ required: "Opportunity is required" }} render={({ field }) => <OpportunitySelect value={field.value} onChange={field.onChange} disabled={!selectedClientId || availableOpportunities.length === 0} opportunities={availableOpportunities} />} />{selectedClientId > 0 && availableOpportunities.length === 0 && <p className="text-sm text-amber-700 dark:text-amber-400">Create an opportunity for this client before recording an interaction.</p>}{errors.opportunityId && <p className="text-sm text-destructive">{errors.opportunityId.message}</p>}</div>}
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
  const { data: opportunities } = useOpportunities({ clientId: selectedClientId || undefined, limit: 100 });
  const selectedDateTime = watch("dueAt") ?? "";
  const day = selectedDateTime.slice(0, 10);
  const duration = Number(watch("estimatedMinutes"));
  const availability = useFollowUpAvailability(selectedClientId, day);
  const slots = useMemo(() => Array.from({ length: 96 }, (_, index) => `${String(Math.floor(index / 4)).padStart(2, "0")}:${String(index % 4 * 15).padStart(2, "0")}`), []);
  const occupied = (time: string) => {
    if (!day || !Number.isFinite(duration) || duration <= 0) return false;
    const start = new Date(`${day}T${time}:00`).getTime();
    return availability.data?.some((item) => item.id !== followUp?.id && start < new Date(item.end).getTime() && start + duration * 60_000 > new Date(item.start).getTime()) ?? false;
  };

  useEffect(() => {
    if (!open) return;
    const tomorrow = new Date(Date.now() + 86_400_000);
    tomorrow.setHours(9, 0, 0, 0);
    reset({ clientId: String(followUp?.clientId ?? clientId ?? ""), opportunityId: String(followUp?.opportunityId ?? opportunityId ?? ""), title: followUp?.title ?? "", channel: followUp?.channel ?? "", dueAt: toLocalInput(followUp?.dueAt ?? tomorrow), estimatedMinutes: followUp?.estimatedMinutes == null ? (followUp?.channel ? String(defaultMinutes[followUp.channel]) : "") : String(followUp.estimatedMinutes), appointmentConfirmed: followUp?.appointmentConfirmed ?? false });
  }, [clientId, followUp, open, opportunityId, reset]);

  const submit = async (values: FollowUpForm) => {
    const input: FollowUpInput = { clientId: Number(values.clientId), opportunityId: Number(values.opportunityId), title: values.title, channel: values.channel as InteractionType, dueAt: new Date(values.dueAt).toISOString(), estimatedMinutes: Number(values.estimatedMinutes), appointmentConfirmed: (values.channel === "MEETING" || values.channel === "SITE_VISIT") && values.appointmentConfirmed };
    await save.mutateAsync({ id: followUp?.id, input });
    onOpenChange(false);
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-xl">
    <DialogHeader><DialogTitle>{followUp ? "Edit follow-up" : "Schedule follow-up"}</DialogTitle><DialogDescription>Assign a dated next action to the client owner.</DialogDescription></DialogHeader>
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(submit)}>
      {!followUp && !clientId && <div className="space-y-2 sm:col-span-2"><Label htmlFor="follow-up-client">Client *</Label><Controller name="clientId" control={control} rules={{ required: "Client is required" }} render={({ field }) => <Select value={field.value} onValueChange={(value) => { field.onChange(value); setValue("opportunityId", ""); }}><SelectTrigger id="follow-up-client"><SelectValue placeholder="Select client" /></SelectTrigger><SelectContent>{clients?.clients.map((client) => <SelectItem key={client.id} value={String(client.id)}>{client.businessName}</SelectItem>)}</SelectContent></Select>} />{errors.clientId && <p className="text-sm text-destructive">{errors.clientId.message}</p>}</div>}
      {!opportunityId && <div className="space-y-2 sm:col-span-2"><Label htmlFor="activity-opportunity">Opportunity *</Label><Controller name="opportunityId" control={control} rules={{ required: "Opportunity is required" }} render={({ field }) => <OpportunitySelect value={field.value} onChange={field.onChange} disabled={!selectedClientId || (opportunities?.opportunities.length ?? 0) === 0} opportunities={opportunities?.opportunities ?? []} />} />{selectedClientId > 0 && (opportunities?.opportunities.length ?? 0) === 0 && <p className="text-sm text-amber-700 dark:text-amber-400">Create an opportunity for this client before scheduling a follow-up.</p>}{errors.opportunityId && <p className="text-sm text-destructive">{errors.opportunityId.message}</p>}</div>}
      <div className="space-y-2 sm:col-span-2"><Label htmlFor="follow-up-title">Next action *</Label><Input id="follow-up-title" maxLength={200} placeholder="Call procurement manager" {...register("title", { required: "Next action is required" })} />{errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}</div>
      <div className="space-y-2"><Label htmlFor="follow-up-channel">Channel *</Label><Controller name="channel" control={control} rules={{ required: "Channel is required" }} render={({ field }) => <Select value={field.value} onValueChange={(value: InteractionType) => { const current = watch("estimatedMinutes"); if (!current || (field.value && current === String(defaultMinutes[field.value]))) setValue("estimatedMinutes", String(defaultMinutes[value])); field.onChange(value); }}><SelectTrigger id="follow-up-channel"><SelectValue placeholder="Select channel" /></SelectTrigger><SelectContent>{interactionTypes.filter((type) => type.value !== "FOLLOW_UP" || followUp?.channel === "FOLLOW_UP").map((type) => <SelectItem key={type.value} value={type.value} disabled={type.value === "FOLLOW_UP"}>{type.label}</SelectItem>)}</SelectContent></Select>} />{errors.channel && <p className="text-sm text-destructive">{errors.channel.message}</p>}</div>
      <div className="space-y-2"><Label htmlFor="follow-up-date">Scheduled date *</Label><Input id="follow-up-date" type="date" value={day} onChange={(event) => setValue("dueAt", `${event.target.value}T${selectedDateTime.slice(11, 16) || "09:00"}`, { shouldValidate: true })} />{errors.dueAt && <p className="text-sm text-destructive">{errors.dueAt.message}</p>}</div>
      <div className="space-y-2"><Label htmlFor="follow-up-duration">Estimated minutes *</Label><Input id="follow-up-duration" type="number" min="15" max="4800" step="15" {...register("estimatedMinutes", { validate: (value) => (Number.isInteger(Number(value)) && value !== "" && Number(value) >= 15 && Number(value) <= 4800 && Number(value) % 15 === 0) || "Use 15-minute increments" })} /><p className="text-xs text-muted-foreground">Defaults: email 15, call 30, meeting 60, site visit 120. Planning estimate only.</p>{errors.estimatedMinutes && <p className="text-sm text-destructive">{errors.estimatedMinutes.message}</p>}</div>
      <div className="space-y-2"><Label htmlFor="follow-up-time">Scheduled time *</Label><Controller name="dueAt" control={control} rules={{ required: "Scheduled time is required", validate: (value) => (!availability.isLoading && !availability.isError && !!value && !occupied(value.slice(11, 16))) || "Choose an available time" }} render={({ field }) => <Select value={field.value?.slice(11, 16)} onValueChange={(time) => field.onChange(`${day}T${time}`)} disabled={!day || !duration || availability.isLoading || availability.isError}><SelectTrigger id="follow-up-time"><SelectValue placeholder="Select time" /></SelectTrigger><SelectContent className="max-h-64">{slots.map((time) => <SelectItem key={time} value={time} disabled={occupied(time)}>{time}{occupied(time) ? " · Busy" : ""}</SelectItem>)}</SelectContent></Select>} />{availability.isError && <p className="text-sm text-destructive">Could not check availability. Try again.</p>}{errors.dueAt && <p className="text-sm text-destructive">{errors.dueAt.message}</p>}</div>
      {(watch("channel") === "MEETING" || watch("channel") === "SITE_VISIT") && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" {...register("appointmentConfirmed")} />Confirmed appointment</label>}
      {save.error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{save.error.message}</p>}
      <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving..." : "Save follow-up"}</Button></div>
    </form>
  </DialogContent></Dialog>;
}
