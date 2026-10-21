import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/app/auth/useAuth";
import { useAccounts } from "@/features/customers/hooks/useAccounts";
import { useOpportunityProducts, useSaveOpportunity } from "../hooks/useOpportunities";
import type { Currency, Opportunity, OpportunityInput, SalesRoute } from "../services/opportunitiesApi";

type FormValues = {
  accountId: string;
  ownerId: string;
  productGroupId: string;
  productSubgroupId: string;
  title: string;
  estimatedAmount: string;
  currency: Currency;
  routeToMarket: "" | SalesRoute;
  estimatedCloseAt: string;
};

const selectClass = "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm";
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
  const { data: accounts } = useAccounts();
  const { data: productGroups } = useOpportunityProducts();
  const save = useSaveOpportunity();
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>();
  const selectedAccountId = watch("accountId");
  const selectedProductGroupId = watch("productGroupId");
  const selectedProductSubgroupId = watch("productSubgroupId");
  const selectedAccount = useMemo(() => accounts?.accounts.find((item) => item.id === Number(selectedAccountId)), [accounts?.accounts, selectedAccountId]);
  const subgroups = useMemo(() => productGroups?.find((group) => group.id === Number(selectedProductGroupId))?.subgroups ?? [], [productGroups, selectedProductGroupId]);

  useEffect(() => {
    if (!open) return;
    reset({
      accountId: opportunity ? String(opportunity.accountId) : "",
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
    if (open && selectedAccount) setValue("ownerId", String(selectedAccount.ownerId));
  }, [open, selectedAccount, setValue]);

  useEffect(() => {
    if (!productGroups) return;
    if (!selectedProductGroupId && selectedProductSubgroupId) setValue("productSubgroupId", "");
    else if (selectedProductSubgroupId && !subgroups.some((subgroup) => subgroup.id === Number(selectedProductSubgroupId))) setValue("productSubgroupId", "");
  }, [productGroups, selectedProductGroupId, selectedProductSubgroupId, setValue, subgroups]);

  const submit = async (values: FormValues) => {
    const input: OpportunityInput = {
      accountId: Number(values.accountId),
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
        <div className="space-y-2"><Label htmlFor="accountId">Account *</Label><select id="accountId" className={selectClass} {...register("accountId", { required: "Account is required" })}><option value="">Select account</option>{accounts?.accounts.map((account) => <option key={account.id} value={account.id}>{account.businessName}</option>)}</select>{errors.accountId && <p className="text-sm text-destructive">{errors.accountId.message}</p>}</div>
        <div className="space-y-2"><Label htmlFor="ownerName">Owner</Label><Input id="ownerName" readOnly value={selectedAccount?.owner ? `${selectedAccount.owner.firstName} ${selectedAccount.owner.lastName}` : "Select an account first"} /><input type="hidden" {...register("ownerId", { required: true })} /><p className="text-xs text-muted-foreground">Inherited from the selected account.</p></div>
        <div className="space-y-2"><Label htmlFor="estimatedAmount">Estimated amount *</Label><Input id="estimatedAmount" inputMode="decimal" placeholder="250000.00" {...register("estimatedAmount", { required: "Amount is required", pattern: { value: /^(0|[1-9]\d{0,15})(\.\d{1,2})?$/, message: "Use a valid amount with at most two decimals" } })} />{errors.estimatedAmount && <p className="text-sm text-destructive">{errors.estimatedAmount.message}</p>}</div>
        <div className="space-y-2"><Label htmlFor="currency">Saved currency *</Label><select id="currency" className={selectClass} {...register("currency")}><option value="KES">KES</option><option value="USD">USD</option></select></div>
        <div className="space-y-2"><Label htmlFor="productGroupId">Product group</Label><select id="productGroupId" className={selectClass} {...register("productGroupId")}><option value="">Not selected</option>{productGroups?.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="productSubgroupId">Product subgroup</Label><select id="productSubgroupId" className={selectClass} disabled={!selectedProductGroupId} {...register("productSubgroupId")}><option value="">Not selected</option>{subgroups.map((subgroup) => <option key={subgroup.id} value={subgroup.id}>{subgroup.name}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="routeToMarket">Route to market</Label><select id="routeToMarket" className={selectClass} {...register("routeToMarket")}><option value="">Not selected</option>{routes.map((route) => <option key={route.value} value={route.value}>{route.label}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="estimatedCloseAt">Estimated close date</Label><DateInput id="estimatedCloseAt" {...register("estimatedCloseAt")} /></div>
        {save.error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{save.error.message}</p>}
        <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving..." : "Save opportunity"}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
