import { type FormEvent, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUIStore } from "@/app/store";
import { formatMoney } from "@/lib/currency";
import { opportunityStageClass, opportunityStageLabels } from "@/features/opportunities/utils/labels";
import type { Opportunity } from "@/features/opportunities/services/opportunitiesApi";
import { useClientSalesHistory, useVerifyRevenueCoverage } from "../hooks/useClients";

function isoDate(date: Date) { return date.toISOString().slice(0, 10); }

function OpportunityTable({ opportunities, empty }: { opportunities: Opportunity[]; empty: string }) {
  const displayCurrency = useUIStore((state) => state.displayCurrency);
  if (!opportunities.length) return <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>;
  return <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Opportunity</TableHead><TableHead>Stage</TableHead><TableHead>Value</TableHead><TableHead>Outcome date</TableHead></TableRow></TableHeader><TableBody>{opportunities.map((item) => {
    const isConfirmed = item.outcome === "WON" && item.confirmedAmount && item.confirmedCurrency;
    return <TableRow key={item.id}><TableCell><Link className="font-medium text-primary hover:underline" to={`/dashboard/opportunities/${item.id}`}>{item.title}</Link></TableCell><TableCell><Badge variant="outline" className={opportunityStageClass[item.stage]}>{item.outcome ? item.outcome === "WON" ? "Won" : "Lost" : opportunityStageLabels[item.stage]}</Badge></TableCell><TableCell>{isConfirmed ? formatMoney(Number(item.confirmedAmount), item.confirmedCurrency!, displayCurrency) : item.outcome === "WON" ? <span className="text-amber-700 dark:text-amber-400">Confirmed value missing</span> : formatMoney(Number(item.estimatedAmount), item.currency, displayCurrency)}</TableCell><TableCell>{item.outcomeAt ? new Date(item.outcomeAt).toLocaleDateString() : "—"}</TableCell></TableRow>;
  })}</TableBody></Table></div>;
}

export function ClientSalesHistory({ clientId }: { clientId: number }) {
  const displayCurrency = useUIStore((state) => state.displayCurrency);
  const query = useClientSalesHistory(clientId);
  const verify = useVerifyRevenueCoverage();
  const [dialogOpen, setDialogOpen] = useState(false);
  const today = isoDate(new Date());
  const twoYearsAgo = useMemo(() => { const date = new Date(); date.setUTCFullYear(date.getUTCFullYear() - 2); return isoDate(date); }, []);
  const [coverageStart, setCoverageStart] = useState(twoYearsAgo);
  const [coverageEnd, setCoverageEnd] = useState(today);
  const [evidenceSource, setEvidenceSource] = useState("");
  const data = query.data;

  if (query.isLoading) return <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading sales history...</CardContent></Card>;
  if (!data || query.error) return <Card><CardContent className="py-10 text-center text-sm text-destructive">Unable to load client sales history.</CardContent></Card>;
  const open = data.opportunities.filter((item) => !item.outcome);
  const won = data.opportunities.filter((item) => item.outcome === "WON");
  const lost = data.opportunities.filter((item) => item.outcome === "LOST");
  const evidenceLabel = data.revenueEvidence.state === "VERIFIED_COMPLETE" ? "Verified complete" : data.revenueEvidence.state === "VERIFIED_ZERO" ? "Verified zero" : "Unknown / incomplete";

  const submitCoverage = async (event: FormEvent) => {
    event.preventDefault();
    const end = coverageEnd === today ? new Date() : new Date(`${coverageEnd}T23:59:59.999Z`);
    try {
      await verify.mutateAsync({ id: clientId, input: { coverageStart: new Date(`${coverageStart}T00:00:00.000Z`).toISOString(), coverageEnd: end.toISOString(), evidenceSource } });
      setDialogOpen(false);
      setEvidenceSource("");
    } catch { /* mutation error is displayed below */ }
  };

  return <div className="space-y-4"><div className="grid gap-4 md:grid-cols-3"><Card><CardHeader className="pb-2"><CardDescription>Confirmed sales recorded</CardDescription><CardTitle>{formatMoney(Number(data.confirmedSales.totalUsd), "USD", displayCurrency, Number(data.confirmedSales.conversionBasis.kesPerUsd))}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{data.confirmedSales.eligibleCount} Won opportunities with confirmed values{data.confirmedSales.missingConfirmedCount ? ` · ${data.confirmedSales.missingConfirmedCount} missing values` : ""}</CardContent></Card><Card><CardHeader className="pb-2"><CardDescription>Previous two-year revenue</CardDescription><CardTitle>{data.revenueEvidence.amountUsd === null ? "Unavailable" : formatMoney(Number(data.revenueEvidence.amountUsd), "USD", displayCurrency, Number(data.confirmedSales.conversionBasis.kesPerUsd))}</CardTitle></CardHeader><CardContent className="flex flex-wrap items-center gap-2"><Badge variant={data.revenueEvidence.state === "UNKNOWN" ? "outline" : "secondary"}>{evidenceLabel}</Badge>{data.revenueEvidence.ibmRevenueCode !== null && <span className="text-xs text-muted-foreground">History band {data.revenueEvidence.ibmRevenueCode}</span>}</CardContent></Card><Card><CardHeader className="pb-2"><CardDescription>Revenue coverage</CardDescription><CardTitle className="text-base">{data.revenueEvidence.coverage ? `${new Date(data.revenueEvidence.coverage.coverageStart).toLocaleDateString()} onward` : "Not verified"}</CardTitle></CardHeader><CardContent><Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>Verify history coverage</Button></CardContent></Card></div>{data.revenueEvidence.reviewReason && <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">{data.revenueEvidence.reviewReason}</p>}<Card><CardHeader><CardTitle>Opportunity and sales history</CardTitle><CardDescription>Estimated values remain separate from confirmed Won values.</CardDescription></CardHeader><CardContent><Tabs defaultValue="open"><TabsList className="max-w-full overflow-x-auto"><TabsTrigger value="open">Open ({open.length})</TabsTrigger><TabsTrigger value="won">Won ({won.length})</TabsTrigger><TabsTrigger value="lost">Lost ({lost.length})</TabsTrigger><TabsTrigger value="timeline">Timeline</TabsTrigger></TabsList><TabsContent value="open"><OpportunityTable opportunities={open} empty="No open opportunities." /></TabsContent><TabsContent value="won"><OpportunityTable opportunities={won} empty="No Won opportunities." /></TabsContent><TabsContent value="lost"><OpportunityTable opportunities={lost} empty="No Lost opportunities." /></TabsContent><TabsContent value="timeline"><div className="space-y-3 pt-4">{!data.opportunities.length ? <p className="py-8 text-center text-sm text-muted-foreground">No opportunity history.</p> : data.opportunities.map((item) => <div key={item.id} className="flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"><div><Link className="font-medium text-primary hover:underline" to={`/dashboard/opportunities/${item.id}`}>{item.title}</Link><p className="text-xs text-muted-foreground">Created {new Date(item.createdAt).toLocaleDateString()}</p></div><div className="text-sm sm:text-right"><p>{item.outcome ? `${item.outcome === "WON" ? "Won" : "Lost"} ${item.outcomeAt ? `on ${new Date(item.outcomeAt).toLocaleDateString()}` : ""}` : opportunityStageLabels[item.stage]}</p><p className="text-xs text-muted-foreground">{item.owner.firstName} {item.owner.lastName}</p></div></div>)}</div></TabsContent></Tabs></CardContent></Card><Dialog open={dialogOpen} onOpenChange={(open) => !verify.isPending && setDialogOpen(open)}><DialogContent><DialogHeader><DialogTitle>Verify revenue-history coverage</DialogTitle><DialogDescription>Confirm that all qualifying sales in this period are represented by recorded Won opportunities. AutoBridge calculates the value; no revenue amount is entered here.</DialogDescription></DialogHeader><form className="mt-4 space-y-4" onSubmit={submitCoverage}><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="coverageStart">Coverage start</Label><DateInput id="coverageStart" value={coverageStart} max={coverageEnd} onChange={(event) => setCoverageStart(event.target.value)} required /></div><div className="space-y-2"><Label htmlFor="coverageEnd">Coverage end</Label><DateInput id="coverageEnd" value={coverageEnd} min={coverageStart} max={today} onChange={(event) => setCoverageEnd(event.target.value)} required /></div></div><div className="space-y-2"><Label htmlFor="evidenceSource">Evidence source</Label><Input id="evidenceSource" value={evidenceSource} onChange={(event) => setEvidenceSource(event.target.value)} placeholder="e.g. Reviewed complete invoice and CRM records" required /></div>{verify.error && <p role="alert" className="text-sm text-destructive">{verify.error.message}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={verify.isPending}>Cancel</Button><Button type="submit" disabled={verify.isPending || !coverageStart || !coverageEnd || evidenceSource.trim().length < 3}>{verify.isPending ? "Verifying..." : "Verify coverage"}</Button></div></form></DialogContent></Dialog></div>;
}
