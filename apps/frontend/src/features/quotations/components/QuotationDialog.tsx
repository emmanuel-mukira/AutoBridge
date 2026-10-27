import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { useContacts } from "@/features/clients/hooks/useContacts";
import { useCatalogueProducts, useSaveQuotation } from "../hooks/useQuotations";
import type { CatalogueProduct, Quotation } from "../services/quotationsApi";

type DraftLine = { product: CatalogueProduct; quantity: string };

const toDateInput = (value: Date | string) =>
  new Date(value).toISOString().slice(0, 10);
const defaultValidUntil = () => {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return toDateInput(date);
};
const money = (value: number) =>
  `KES ${value.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function QuotationDialog({
  open,
  onOpenChange,
  opportunityId,
  clientId,
  quotation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId: number;
  clientId: number;
  quotation?: Quotation | null;
}) {
  const [search, setSearch] = useState("");
  const [contactId, setContactId] = useState("none");
  const [validUntil, setValidUntil] = useState(defaultValidUntil);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(
    "Prices are valid until the date shown and subject to product availability.",
  );
  const [discountPercent, setDiscountPercent] = useState("0");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const products = useCatalogueProducts(search);
  const contacts = useContacts(clientId);
  const save = useSaveQuotation(opportunityId);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setContactId(quotation?.contactId ? String(quotation.contactId) : "none");
    setValidUntil(
      quotation ? toDateInput(quotation.validUntil) : defaultValidUntil(),
    );
    setNotes(quotation?.notes ?? "");
    setTerms(
      quotation?.terms ??
        "Prices are valid until the date shown and subject to product availability.",
    );
    setDiscountPercent(quotation?.discountPercent ?? "0");
    setLines(
      quotation?.items.map((item) => ({
        product: {
          id: item.productId,
          productSubgroupId: 0,
          sku: item.skuSnapshot,
          name: item.productNameSnapshot,
          description: item.descriptionSnapshot,
          brand: item.brandSnapshot,
          specifications: null,
          unitOfMeasure: item.unitSnapshot,
          defaultSellingPrice: item.unitPrice,
          currency: "KES",
          priceSourceName: "Saved quotation snapshot",
          active: item.product.active,
          priceClassification: "PUBLIC_RETAIL_REFERENCE",
          productSubgroup: {
            id: 0,
            name: "Saved item",
            productGroup: { id: 0, name: "Saved item" },
          },
        },
        quantity: item.quantity,
      })) ?? [],
    );
  }, [open, quotation]);

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
  const discountAmount = (subtotal * Number(discountPercent || 0)) / 100;
  const addProduct = (product: CatalogueProduct) =>
    setLines((current) =>
      current.some((line) => line.product.id === product.id)
        ? current
        : [...current, { product, quantity: "1" }],
    );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!lines.length || !quotation) return;
    try {
      await save.mutateAsync({
        id: quotation.id,
        input: {
          contactId: contactId === "none" ? null : Number(contactId),
          validUntil: new Date(`${validUntil}T23:59:59.999Z`).toISOString(),
          discountPercent,
          notes: notes.trim() || null,
          terms: terms.trim() || null,
          items: lines.map((line) => ({
            productId: line.product.id,
            quantity: line.quantity,
          })),
        },
      });
      onOpenChange(false);
    } catch {
      /* toast and inline error handle this */
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !save.isPending && onOpenChange(next)}
    >
      <DialogContent className="sm:max-w-5xl">
        <form onSubmit={submit} className="space-y-6">
          <DialogHeader>
            <DialogTitle>
              {quotation
                ? `Edit ${quotation.quoteNumber} · Version ${quotation.version}`
                : "Edit quotation"}
            </DialogTitle>
            <DialogDescription>
              Change quantities or apply a negotiated percentage discount.
              Catalogue prices and server-calculated totals are authoritative.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <section className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="catalogue-search">Product catalogue</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="catalogue-search"
                    className="pl-9"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search SKU, product or brand"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Prices are public retail references, not verified wholesale
                offers.
              </p>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-2">
                {products.isLoading && (
                  <p className="p-3 text-sm text-muted-foreground">
                    Loading products...
                  </p>
                )}
                {products.error && (
                  <p role="alert" className="p-3 text-sm text-destructive">
                    Unable to load products.
                  </p>
                )}
                {products.data?.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-start justify-between gap-3 rounded-md p-2 hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {product.sku} · {product.productSubgroup.name} ·{" "}
                        {money(Number(product.defaultSellingPrice))}/
                        {product.unitOfMeasure}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
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
                    No active products match this search.
                  </p>
                )}
              </div>
            </section>
            <section className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quotation-contact">Contact</Label>
                  <Select value={contactId} onValueChange={setContactId}>
                    <SelectTrigger id="quotation-contact">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No named contact</SelectItem>
                      {contacts.data?.contacts.map((contact) => (
                        <SelectItem key={contact.id} value={String(contact.id)}>
                          {contact.firstName} {contact.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quotation-valid-until">Valid until</Label>
                  <Input
                    id="quotation-valid-until"
                    type="date"
                    required
                    min={toDateInput(new Date())}
                    value={validUntil}
                    onChange={(event) => setValidUntil(event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Quotation items</Label>
                {!lines.length ? (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Add at least one catalogue product.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lines.map((line, index) => (
                      <div
                        key={line.product.id}
                        className="rounded-md border p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">
                              {line.product.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {line.product.sku} · {line.product.unitOfMeasure}{" "}
                              ·{" "}
                              {money(Number(line.product.defaultSellingPrice))}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              setLines((current) =>
                                current.filter(
                                  (_, lineIndex) => lineIndex !== index,
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
                        <div className="mt-3 max-w-36">
                          <Label
                            className="text-xs"
                            htmlFor={`quantity-${line.product.id}`}
                          >
                            Quantity
                          </Label>
                          <Input
                            id={`quantity-${line.product.id}`}
                            type="number"
                            min="0.001"
                            step="0.001"
                            required
                            value={line.quantity}
                            onChange={(event) =>
                              setLines((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, quantity: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="quotation-discount">
                  Negotiated discount (%)
                </Label>
                <Input
                  id="quotation-discount"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                  value={discountPercent}
                  onChange={(event) => setDiscountPercent(event.target.value)}
                />
              </div>
              <div className="rounded-md bg-muted/50 p-3 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <strong>{money(subtotal)}</strong>
                </div>
                <div className="mt-1 flex justify-between text-muted-foreground">
                  <span>Discount ({discountPercent || 0}%)</span>
                  <span>− {money(discountAmount)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t pt-2 text-base">
                  <strong>Total</strong>
                  <strong>{money(subtotal - discountAmount)}</strong>
                </div>
              </div>
            </section>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quotation-notes">Notes</Label>
              <Textarea
                id="quotation-notes"
                maxLength={2000}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quotation-terms">Commercial terms</Label>
              <Textarea
                id="quotation-terms"
                maxLength={2000}
                value={terms}
                onChange={(event) => setTerms(event.target.value)}
              />
            </div>
          </div>
          {save.error && (
            <p role="alert" className="text-sm text-destructive">
              {save.error.message}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={save.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending || !lines.length}>
              {save.isPending ? "Saving..." : "Save draft"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
