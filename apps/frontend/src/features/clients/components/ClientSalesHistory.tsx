import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUIStore } from "@/app/store";
import { formatMoney } from "@/lib/currency";
import { opportunityStageClass, opportunityStageLabels } from "@/features/opportunities/utils/labels";
import type { Opportunity } from "@/features/opportunities/services/opportunitiesApi";
import { useClientSalesHistory, useVerifyRevenueCoverage } from "../hooks/useClients";

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
  const data = query.data;

  if (query.isLoading) return <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading sales history...</CardContent></Card>;
  if (!data || query.error) return <Card><CardContent className="py-10 text-center text-sm text-destructive">Unable to load client sales history.</CardContent></Card>;
  const open = data.opportunities.filter((item) => !item.outcome);
  const won = data.opportunities.filter((item) => item.outcome === "WON");
  const lost = data.opportunities.filter((item) => item.outcome === "LOST");
  const evidenceLabel = data.revenueEvidence.state === "VERIFIED_COMPLETE" ? "Verified sales history" : data.revenueEvidence.state === "VERIFIED_ZERO" ? "Verified no previous sales" : "Sales history not verified";

  const confirmCoverage = async () => {
    try {
      await verify.mutateAsync({ id: clientId, input: { confirmedComplete: true } });
      setDialogOpen(false);
    } catch { /* mutation error is displayed below */ }
  };

  return <div className="space-y-4"><div className="grid gap-4 md:grid-cols-3"><Card><CardHeader className="pb-2"><CardDescription>Confirmed sales recorded</CardDescription><CardTitle>{formatMoney(Number(data.confirmedSales.totalUsd), "USD", displayCurrency, Number(data.confirmedSales.conversionBasis.kesPerUsd))}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{data.confirmedSales.eligibleCount} Won opportunities with confirmed values{data.confirmedSales.missingConfirmedCount ? ` · ${data.confirmedSales.missingConfirmedCount} missing values` : ""}</CardContent></Card><Card><CardHeader className="pb-2"><CardDescription>Previous two-year revenue</CardDescription><CardTitle>{data.revenueEvidence.amountUsd === null ? "Unavailable" : formatMoney(Number(data.revenueEvidence.amountUsd), "USD", displayCurrency, Number(data.confirmedSales.conversionBasis.kesPerUsd))}</CardTitle></CardHeader><CardContent className="flex flex-wrap items-center gap-2"><Badge variant={data.revenueEvidence.state === "UNKNOWN" ? "outline" : "secondary"}>{evidenceLabel}</Badge></CardContent></Card><Card><CardHeader className="pb-2"><CardDescription>Sales-history status</CardDescription><CardTitle className="text-base">{evidenceLabel}</CardTitle></CardHeader><CardContent className="space-y-2"><p className="text-xs text-muted-foreground">{data.revenueEvidence.state === "UNKNOWN" ? "AutoBridge will use the limited-history prediction until completeness is confirmed." : `Confirmed by ${data.revenueEvidence.coverage?.verifiedBy ? `${data.revenueEvidence.coverage.verifiedBy.firstName} ${data.revenueEvidence.coverage.verifiedBy.lastName}` : "an authorised user"}.`}</p><Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>Confirm sales history</Button></CardContent></Card></div>{data.revenueEvidence.reviewReason && <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">{data.revenueEvidence.reviewReason}</p>}<Card><CardHeader><CardTitle>Opportunity and sales history</CardTitle><CardDescription>Estimated values remain separate from confirmed Won values.</CardDescription></CardHeader><CardContent><Tabs defaultValue="open"><TabsList className="max-w-full overflow-x-auto"><TabsTrigger value="open">Open ({open.length})</TabsTrigger><TabsTrigger value="won">Won ({won.length})</TabsTrigger><TabsTrigger value="lost">Lost ({lost.length})</TabsTrigger><TabsTrigger value="timeline">Timeline</TabsTrigger></TabsList><TabsContent value="open"><OpportunityTable opportunities={open} empty="No open opportunities." /></TabsContent><TabsContent value="won"><OpportunityTable opportunities={won} empty="No Won opportunities." /></TabsContent><TabsContent value="lost"><OpportunityTable opportunities={lost} empty="No Lost opportunities." /></TabsContent><TabsContent value="timeline"><div className="space-y-3 pt-4">{!data.opportunities.length ? <p className="py-8 text-center text-sm text-muted-foreground">No opportunity history.</p> : data.opportunities.map((item) => <div key={item.id} className="flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"><div><Link className="font-medium text-primary hover:underline" to={`/dashboard/opportunities/${item.id}`}>{item.title}</Link><p className="text-xs text-muted-foreground">Created {new Date(item.createdAt).toLocaleDateString()}</p></div><div className="text-sm sm:text-right"><p>{item.outcome ? `${item.outcome === "WON" ? "Won" : "Lost"} ${item.outcomeAt ? `on ${new Date(item.outcomeAt).toLocaleDateString()}` : ""}` : opportunityStageLabels[item.stage]}</p><p className="text-xs text-muted-foreground">{item.owner.firstName} {item.owner.lastName}</p></div></div>)}</div></TabsContent></Tabs></CardContent></Card><Dialog open={dialogOpen} onOpenChange={(open) => !verify.isPending && setDialogOpen(open)}><DialogContent><DialogHeader><DialogTitle>Confirm complete sales history</DialogTitle><DialogDescription>Confirm that every qualifying sale from the previous two years is recorded as a Won opportunity. AutoBridge sets the dates and calculates the total. If you are not sure the records are complete, cancel and the safer limited-history prediction will remain in use.</DialogDescription></DialogHeader>{verify.error && <p role="alert" className="text-sm text-destructive">{verify.error.message}</p>}<div className="mt-4 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={verify.isPending}>Cancel</Button><Button type="button" onClick={confirmCoverage} disabled={verify.isPending}>{verify.isPending ? "Confirming..." : "Yes, history is complete"}</Button></div></DialogContent></Dialog></div>;
}
