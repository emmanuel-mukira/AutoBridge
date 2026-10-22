import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/app/auth/useAuth";
import { useClients } from "@/features/clients/hooks/useClients";
import { useOpportunityProducts, useSaveOpportunity } from "../hooks/useOpportunities";
import type { Currency, Opportunity, OpportunityInput, SalesRoute } from "../services/opportunitiesApi";

type FormValues = {
  clientId: string;
  ownerId: string;
  productGroupId: string;
  productSubgroupId: string;
  title: string;
  estimatedAmount: string;
  currency: Currency;
  routeToMarket: "" | SalesRoute;
  estimatedCloseAt: string;
};

const none = "none";
const routes: { value: SalesRoute; label: string }[] = [
  { value: "FIELDS_SALES", label: "Field sales" },
  { value: "RESELLER", label: "Reseller" },
  { value: "TELECOVERAGE", label: "Telecoverage" },
  { value: "TELESALES", label: "Telesales" },
  { value: "OTHER", label: "Other" },
];

function localDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function OpportunityDialog({ open, onOpenChange, opportunity }: { open: boolean; onOpenChange: (open: boolean) => void; opportunity?: Opportunity }) {
  const { user } = useAuth();
  const { data: clients } = useClients();
  const { data: productGroups } = useOpportunityProducts();
  const save = useSaveOpportunity();
  const { register, handleSubmit, reset, watch, setValue, control, formState: { errors } } = useForm<FormValues>();
  const selectedClientId = watch("clientId");
  const selectedProductGroupId = watch("productGroupId");
  const selectedProductSubgroupId = watch("productSubgroupId");
  const selectedClient = useMemo(() => clients?.clients.find((item) => item.id === Number(selectedClientId)), [clients?.clients, selectedClientId]);
  const subgroups = useMemo(() => productGroups?.find((group) => group.id === Number(selectedProductGroupId))?.subgroups ?? [], [productGroups, selectedProductGroupId]);

  useEffect(() => {
    if (!open) return;
    reset({
      clientId: opportunity ? String(opportunity.clientId) : "",
      ownerId: String(opportunity?.ownerId ?? user?.id ?? ""),
      productGroupId: opportunity?.productSubgroup ? String(opportunity.productSubgroup.productGroup.id) : "",
      productSubgroupId: opportunity?.productSubgroupId ? String(opportunity.productSubgroupId) : "",
      title: opportunity?.title ?? "",
      estimatedAmount: opportunity?.estimatedAmount ?? "",
      currency: opportunity?.currency ?? "KES",
      routeToMarket: opportunity?.routeToMarket ?? "",
      estimatedCloseAt: localDate(opportunity?.estimatedCloseAt ?? null),
    });
  }, [open, opportunity, reset, user?.id]);

  useEffect(() => {
    if (open && selectedClient) setValue("ownerId", String(selectedClient.ownerId));
  }, [open, selectedClient, setValue]);

  useEffect(() => {
    if (!productGroups) return;
    if (!selectedProductGroupId && selectedProductSubgroupId) setValue("productSubgroupId", "");
    else if (selectedProductSubgroupId && !subgroups.some((subgroup) => subgroup.id === Number(selectedProductSubgroupId))) setValue("productSubgroupId", "");
  }, [productGroups, selectedProductGroupId, selectedProductSubgroupId, setValue, subgroups]);

  const submit = async (values: FormValues) => {
    const input: OpportunityInput = {
      clientId: Number(values.clientId),
      ownerId: Number(values.ownerId),
      productSubgroupId: values.productSubgroupId ? Number(values.productSubgroupId) : null,
      title: values.title,
      estimatedAmount: values.estimatedAmount,
      currency: values.currency,
      routeToMarket: values.routeToMarket || null,
      estimatedCloseAt: values.estimatedCloseAt ? new Date(`${values.estimatedCloseAt}T12:00:00`).toISOString() : null,
    };
    await save.mutateAsync({ id: opportunity?.id, input });
    onOpenChange(false);
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader><DialogTitle>{opportunity ? "Edit opportunity" : "New opportunity"}</DialogTitle><DialogDescription>Record the commercial details. Product and route can be added later.</DialogDescription></DialogHeader>
      <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(submit)}>
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="title">Title *</Label><Input id="title" placeholder="e.g. Fleet battery replacement" {...register("title", { required: "Title is required", maxLength: 200 })} />{errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}</div>
        <div className="space-y-2"><Label htmlFor="clientId">Client *</Label><Controller name="clientId" control={control} rules={{ required: "Client is required" }} render={({ field }) => <Select value={field.value} onValueChange={field.onChange}><SelectTrigger id="clientId"><SelectValue placeholder="Select client" /></SelectTrigger><SelectContent>{clients?.clients.map((client) => <SelectItem key={client.id} value={String(client.id)}>{client.businessName}</SelectItem>)}</SelectContent></Select>} />{errors.clientId && <p className="text-sm text-destructive">{errors.clientId.message}</p>}</div>
        <div className="space-y-2"><Label htmlFor="ownerName">Owner</Label><Input id="ownerName" readOnly value={selectedClient?.owner ? `${selectedClient.owner.firstName} ${selectedClient.owner.lastName}` : "Select a client first"} /><input type="hidden" {...register("ownerId", { required: true })} /><p className="text-xs text-muted-foreground">Inherited from the selected client.</p></div>
        <div className="space-y-2"><Label htmlFor="estimatedAmount">Estimated amount *</Label><Input id="estimatedAmount" inputMode="decimal" placeholder="250000.00" {...register("estimatedAmount", { required: "Amount is required", pattern: { value: /^(0|[1-9]\d{0,15})(\.\d{1,2})?$/, message: "Use a valid amount with at most two decimals" } })} />{errors.estimatedAmount && <p className="text-sm text-destructive">{errors.estimatedAmount.message}</p>}</div>
        <div className="space-y-2"><Label htmlFor="currency">Saved currency *</Label><Controller name="currency" control={control} render={({ field }) => <Select value={field.value} onValueChange={field.onChange}><SelectTrigger id="currency"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="KES">KES</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent></Select>} /></div>
        <div className="space-y-2"><Label htmlFor="productGroupId">Product group</Label><Controller name="productGroupId" control={control} render={({ field }) => <Select value={field.value || none} onValueChange={(value) => field.onChange(value === none ? "" : value)}><SelectTrigger id="productGroupId"><SelectValue placeholder="Not selected" /></SelectTrigger><SelectContent><SelectItem value={none}>Not selected</SelectItem>{productGroups?.map((group) => <SelectItem key={group.id} value={String(group.id)}>{group.name}</SelectItem>)}</SelectContent></Select>} /></div>
        <div className="space-y-2"><Label htmlFor="productSubgroupId">Product subgroup</Label><Controller name="productSubgroupId" control={control} render={({ field }) => <Select value={field.value || none} onValueChange={(value) => field.onChange(value === none ? "" : value)} disabled={!selectedProductGroupId}><SelectTrigger id="productSubgroupId"><SelectValue placeholder="Not selected" /></SelectTrigger><SelectContent><SelectItem value={none}>Not selected</SelectItem>{subgroups.map((subgroup) => <SelectItem key={subgroup.id} value={String(subgroup.id)}>{subgroup.name}</SelectItem>)}</SelectContent></Select>} /></div>
        <div className="space-y-2"><Label htmlFor="routeToMarket">Route to market</Label><Controller name="routeToMarket" control={control} render={({ field }) => <Select value={field.value || none} onValueChange={(value) => field.onChange(value === none ? "" : value)}><SelectTrigger id="routeToMarket"><SelectValue placeholder="Not selected" /></SelectTrigger><SelectContent><SelectItem value={none}>Not selected</SelectItem>{routes.map((route) => <SelectItem key={route.value} value={route.value}>{route.label}</SelectItem>)}</SelectContent></Select>} /></div>
        <div className="space-y-2"><Label htmlFor="estimatedCloseAt">Estimated close date</Label><DateInput id="estimatedCloseAt" {...register("estimatedCloseAt")} /></div>
        {save.error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{save.error.message}</p>}
        <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving..." : "Save opportunity"}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
