import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCorrectConfirmedSale } from "../hooks/useOpportunities";
import type { Currency, Opportunity } from "../services/opportunitiesApi";

export function ConfirmedSaleDialog({ opportunity, open, onOpenChange }: { opportunity: Opportunity; open: boolean; onOpenChange: (open: boolean) => void }) {
  const mutation = useCorrectConfirmedSale();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("KES");

  useEffect(() => {
    if (open) {
      setAmount(opportunity.confirmedAmount ?? "");
      setCurrency(opportunity.confirmedCurrency ?? opportunity.currency);
      mutation.reset();
    }
  }, [open, opportunity.confirmedAmount, opportunity.confirmedCurrency, opportunity.currency]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!amount) return;
    try {
      await mutation.mutateAsync({ id: opportunity.id, input: { confirmedAmount: amount, confirmedCurrency: currency } });
      onOpenChange(false);
    } catch { /* mutation error is displayed below */ }
  };

  return <Dialog open={open} onOpenChange={(nextOpen) => !mutation.isPending && onOpenChange(nextOpen)}><DialogContent><DialogHeader><DialogTitle>Correct confirmed sale value</DialogTitle><DialogDescription>This updates the realized value used by client sales history. The original estimate remains unchanged.</DialogDescription></DialogHeader><form className="mt-4 space-y-4" onSubmit={submit}><div className="grid gap-4 sm:grid-cols-[1fr_8rem]"><div className="space-y-2"><Label htmlFor="correctedAmount">Confirmed amount *</Label><Input id="correctedAmount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required /></div><div className="space-y-2"><Label htmlFor="correctedCurrency">Currency *</Label><Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}><SelectTrigger id="correctedCurrency"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="KES">KES</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent></Select></div></div>{mutation.error && <p role="alert" className="text-sm text-destructive">{mutation.error.message}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancel</Button><Button type="submit" disabled={mutation.isPending || !amount}>{mutation.isPending ? "Saving..." : "Save correction"}</Button></div></form></DialogContent></Dialog>;
}
