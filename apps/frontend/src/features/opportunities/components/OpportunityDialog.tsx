import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateInput } from "@/components/ui/date-input";
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
import { useClients } from "@/features/clients/hooks/useClients";
import { useContacts } from "@/features/clients/hooks/useContacts";
import { useCatalogueProducts } from "@/features/quotations/hooks/useQuotations";
import type { CatalogueProduct } from "@/features/quotations/services/quotationsApi";
import {
  useOpportunityProducts,
  useSaveOpportunity,
} from "../hooks/useOpportunities";
import type {
  CreateOpportunityInput,
  Opportunity,
  SalesRoute,
  UpdateOpportunityInput,
} from "../services/opportunitiesApi";

type FormValues = {
  clientId: string;
  ownerId: string;
  contactId: string;
  productSubgroupId: string;
  title: string;
  routeToMarket: "" | SalesRoute;
  estimatedCloseAt: string;
};
type DraftLine = { product: CatalogueProduct; quantity: string };

const none = "none";
const routes: { value: SalesRoute; label: string }[] = [
  { value: "FIELDS_SALES", label: "Field sales" },
  { value: "RESELLER", label: "Reseller" },
  { value: "TELECOVERAGE", label: "Telecoverage" },
  { value: "TELESALES", label: "Telesales" },
  { value: "OTHER", label: "Other" },
];
const money = (value: number) =>
  `KES ${value.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
function localDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

export function OpportunityDialog({
  open,
  onOpenChange,
  opportunity,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity?: Opportunity;
}) {
  const { user } = useAuth();
  const { data: clients } = useClients();
  const { data: productGroups } = useOpportunityProducts();
  const save = useSaveOpportunity();
  const [search, setSearch] = useState("");
  const [catalogueGroupId, setCatalogueGroupId] = useState("");
  const [catalogueSubgroupId, setCatalogueSubgroupId] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>();
  const selectedClientId = watch("clientId");
  const contacts = useContacts(Number(selectedClientId) || undefined);
  const products = useCatalogueProducts(
    search,
    Number(catalogueSubgroupId) || undefined,
    Number(catalogueGroupId) || undefined,
  );
  const selectedClient = useMemo(
    () => clients?.clients.find((item) => item.id === Number(selectedClientId)),
    [clients?.clients, selectedClientId],
  );
  const representedSubgroups = useMemo(() => {
    const unique = new Map(
      lines.map((line) => [
        line.product.productSubgroup.id,
        line.product.productSubgroup,
      ]),
    );
    return [...unique.values()];
  }, [lines]);
  const subtotal = useMemo(
    () =>
      lines.reduce(
        (sum, line) =>
          sum +
          Number(line.quantity || 0) * Number(line.product.defaultSellingPrice),
        0,
      ),
    [lines],
  );

  useEffect(() => {
    if (!open) return;
    reset({
      clientId: opportunity ? String(opportunity.clientId) : "",
      ownerId: String(opportunity?.ownerId ?? user?.id ?? ""),
      contactId: none,
      productSubgroupId: opportunity?.productSubgroupId
        ? String(opportunity.productSubgroupId)
        : "",
      title: opportunity?.title ?? "",
      routeToMarket: opportunity?.routeToMarket ?? "",
      estimatedCloseAt: localDate(opportunity?.estimatedCloseAt ?? null),
    });
    setSearch("");
    setCatalogueGroupId("");
    setCatalogueSubgroupId("");
    setLines([]);
  }, [open, opportunity, reset, user?.id]);

  useEffect(() => {
    if (open && selectedClient)
      setValue("ownerId", String(selectedClient.ownerId));
  }, [open, selectedClient, setValue]);

  useEffect(() => {
    if (opportunity) return;
    const selected =
      representedSubgroups.length === 1
        ? String(representedSubgroups[0].id)
        : "";
    setValue("productSubgroupId", selected);
  }, [opportunity, representedSubgroups, setValue]);

  const addProduct = (product: CatalogueProduct) =>
    setLines((current) =>
      current.some((line) => line.product.id === product.id)
        ? current
        : [...current, { product, quantity: "1" }],
    );
  const submit = async (values: FormValues) => {
    const shared = {
      clientId: Number(values.clientId),
      ownerId: Number(values.ownerId),
      title: values.title,
      productSubgroupId: Number(values.productSubgroupId),
      routeToMarket: values.routeToMarket || null,
      estimatedCloseAt: values.estimatedCloseAt
        ? new Date(`${values.estimatedCloseAt}T12:00:00`).toISOString()
        : null,
    };
    if (opportunity) {
      await save.mutateAsync({
        id: opportunity.id,
        input: shared satisfies UpdateOpportunityInput,
      });
    } else {
      const input: CreateOpportunityInput = {
        ...shared,
        contactId: values.contactId === none ? null : Number(values.contactId),
        items: lines.map((line) => ({
          productId: line.product.id,
          quantity: line.quantity,
        })),
      };
      await save.mutateAsync({ input });
    }
    onOpenChange(false);
  };

  const allSubgroups =
    productGroups?.flatMap((group) =>
      group.subgroups.map((subgroup) => ({
        ...subgroup,
        groupName: group.name,
      })),
    ) ?? [];
  const catalogueSubgroups =
    productGroups?.find((group) => group.id === Number(catalogueGroupId))
      ?.subgroups ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {opportunity
              ? "Edit opportunity"
              : "New product-driven opportunity"}
          </DialogTitle>
          <DialogDescription>
            {opportunity
              ? "Update the sales context. Revise the quotation to change products or value."
              : "Select catalogue products; AutoBridge creates Version 1 as a draft and calculates the value on the server."}
          </DialogDescription>
        </DialogHeader>
        <form className="mt-4 space-y-6" onSubmit={handleSubmit(submit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Opportunity name *</Label>
              <Input
                id="title"
                {...register("title", {
                  required: "Name is required",
                  maxLength: 200,
                })}
              />
              {errors.title && (
                <p className="text-sm text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientId">Client *</Label>
              <Controller
                name="clientId"
                control={control}
                rules={{ required: "Client is required" }}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!!opportunity}
                  >
                    <SelectTrigger id="clientId">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients?.clients.map((client) => (
                        <SelectItem key={client.id} value={String(client.id)}>
                          {client.businessName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {!opportunity && (
              <div className="space-y-2">
                <Label htmlFor="contactId">Contact</Label>
                <Controller
                  name="contactId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || none}
                      onValueChange={field.onChange}
                      disabled={!selectedClientId}
                    >
                      <SelectTrigger id="contactId">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={none}>No named contact</SelectItem>
                        {contacts.data?.contacts.map((contact) => (
                          <SelectItem
                            key={contact.id}
                            value={String(contact.id)}
                          >
                            {contact.firstName} {contact.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="ownerName">Owner</Label>
              <Input
                id="ownerName"
                readOnly
                value={
                  selectedClient?.owner
                    ? `${selectedClient.owner.firstName} ${selectedClient.owner.lastName}`
                    : `${opportunity?.owner.firstName ?? ""} ${opportunity?.owner.lastName ?? ""}`.trim()
                }
              />
              <input
                type="hidden"
                {...register("ownerId", { required: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="routeToMarket">Sales route *</Label>
              <Controller
                name="routeToMarket"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="routeToMarket">
                      <SelectValue placeholder="Select route" />
                    </SelectTrigger>
                    <SelectContent>
                      {routes.map((route) => (
                        <SelectItem key={route.value} value={route.value}>
                          {route.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedCloseAt">Estimated close date</Label>
              <DateInput
                id="estimatedCloseAt"
                {...register("estimatedCloseAt")}
              />
            </div>
          </div>

          {!opportunity && (
            <div className="grid gap-6 border-t pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <section className="space-y-3">
                <Label>Product catalogue</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search product, brand or SKU"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={catalogueGroupId || none}
                    onValueChange={(value) => {
                      setCatalogueGroupId(value === none ? "" : value);
                      setCatalogueSubgroupId("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All groups" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={none}>All groups</SelectItem>
                      {productGroups?.map((group) => (
                        <SelectItem key={group.id} value={String(group.id)}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={catalogueSubgroupId || none}
                    onValueChange={(value) =>
                      setCatalogueSubgroupId(value === none ? "" : value)
                    }
                    disabled={!catalogueGroupId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All subgroups" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={none}>All subgroups</SelectItem>
                      {catalogueSubgroups.map((subgroup) => (
                        <SelectItem
                          key={subgroup.id}
                          value={String(subgroup.id)}
                        >
                          {subgroup.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border p-2">
                  {products.data?.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-start justify-between gap-2 rounded p-2 hover:bg-muted/50"
                    >
                      <div>
                        <p className="text-sm font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.sku} · {product.productSubgroup.name} ·{" "}
                          {money(Number(product.defaultSellingPrice))}/
                          {product.unitOfMeasure}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => addProduct(product)}
                        disabled={lines.some(
                          (line) => line.product.id === product.id,
                        )}
                      >
                        <Plus className="h-4 w-4" />
                        <span className="sr-only">Add {product.name}</span>
                      </Button>
                    </div>
                  ))}
                  {products.data?.length === 0 && (
                    <p className="p-3 text-sm text-muted-foreground">
                      No products match.
                    </p>
                  )}
                </div>
              </section>
              <section className="space-y-4">
                <div>
                  <Label>Selected products *</Label>
                  {!lines.length ? (
                    <div className="mt-2 rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                      Add at least one catalogue product.
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {lines.map((line, index) => (
                        <div
                          key={line.product.id}
                          className="grid grid-cols-[1fr_110px_40px] items-end gap-2 rounded-md border p-3"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {line.product.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {money(Number(line.product.defaultSellingPrice))}/
                              {line.product.unitOfMeasure}
                            </p>
                          </div>
                          <div>
                            <Label
                              className="text-xs"
                              htmlFor={`opportunity-quantity-${line.product.id}`}
                            >
                              Quantity
                            </Label>
                            <Input
                              id={`opportunity-quantity-${line.product.id}`}
                              type="number"
                              min="0.001"
                              step="0.001"
                              required
                              value={line.quantity}
                              onChange={(event) =>
                                setLines((current) =>
                                  current.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? {
                                          ...item,
                                          quantity: event.target.value,
                                        }
                                      : item,
                                  ),
                                )
                              }
                            />
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              setLines((current) =>
                                current.filter(
                                  (item) => item.product.id !== line.product.id,
                                ),
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">
                              Remove {line.product.name}
                            </span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {!!lines.length && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="productSubgroupId">
                        Main product category for this opportunity *
                      </Label>
                      <Controller
                        name="productSubgroupId"
                        control={control}
                        rules={{ required: true }}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={representedSubgroups.length === 1}
                          >
                            <SelectTrigger id="productSubgroupId">
                              <SelectValue placeholder="Select the primary purchasing requirement" />
                            </SelectTrigger>
                            <SelectContent>
                              {representedSubgroups.map((subgroup) => (
                                <SelectItem
                                  key={subgroup.id}
                                  value={String(subgroup.id)}
                                >
                                  {subgroup.productGroup.name} — {subgroup.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <p className="text-xs text-muted-foreground">
                        For mixed products, choose the category representing the
                        primary purchasing requirement.
                      </p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-4">
                      <div className="flex justify-between text-sm">
                        <span>Calculated product subtotal</span>
                        <strong>{money(subtotal)}</strong>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Preview only. The saved value is recalculated from
                        catalogue prices by the server.
                      </p>
                    </div>
                  </>
                )}
              </section>
            </div>
          )}

          {opportunity && (
            <div className="space-y-2">
              <Label htmlFor="productSubgroupId">
                Main product category for this opportunity
              </Label>
              <Controller
                name="productSubgroupId"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="productSubgroupId">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allSubgroups.map((subgroup) => (
                        <SelectItem
                          key={subgroup.id}
                          value={String(subgroup.id)}
                        >
                          {subgroup.groupName} — {subgroup.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">
                It must match a product in the current quotation.
              </p>
            </div>
          )}
          {save.error && (
            <p role="alert" className="text-sm text-destructive">
              {save.error.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={save.isPending || (!opportunity && !lines.length)}
            >
              {save.isPending
                ? "Saving..."
                : opportunity
                  ? "Save changes"
                  : "Create opportunity and draft"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
