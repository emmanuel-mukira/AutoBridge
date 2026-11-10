import { useListPagination } from "@/hooks/useListPagination";
import { TablePagination } from "@/components/shared/TablePagination";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUIStore } from "@/app/store";
import { formatMoney } from "@/lib/currency";
import { opportunityStageClass, opportunityStageLabels } from "@/features/opportunities/utils/labels";
import type { Opportunity } from "@/features/opportunities/services/opportunitiesApi";
import { useClientSalesHistory } from "../hooks/useClients";

function OpportunityTable({ opportunities, empty }: { opportunities: Opportunity[]; empty: string }) {
  const displayCurrency = useUIStore((state) => state.displayCurrency);
  const paged = useListPagination(opportunities);
  if (!opportunities.length) return <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>;
  return <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Opportunity</TableHead><TableHead>Stage</TableHead><TableHead>Value</TableHead><TableHead>Outcome date</TableHead></TableRow></TableHeader><TableBody>{paged.visibleItems.map((item) => {
    const isConfirmed = item.outcome === "WON" && item.confirmedAmount && item.confirmedCurrency;
    return <TableRow key={item.id}><TableCell><Link className="font-medium text-primary hover:underline" to={`/dashboard/opportunities/${item.id}`}>{item.title}</Link></TableCell><TableCell><Badge variant="outline" className={opportunityStageClass[item.stage]}>{item.outcome ? item.outcome === "WON" ? "Won" : "Lost" : opportunityStageLabels[item.stage]}</Badge></TableCell><TableCell>{isConfirmed ? formatMoney(Number(item.confirmedAmount), item.confirmedCurrency!, displayCurrency) : item.outcome === "WON" ? <span className="text-amber-700 dark:text-amber-400">Confirmed value missing</span> : formatMoney(Number(item.estimatedAmount), item.currency, displayCurrency)}</TableCell><TableCell>{item.outcomeAt ? new Date(item.outcomeAt).toLocaleDateString() : "—"}</TableCell></TableRow>;
  })}</TableBody></Table><TablePagination {...paged.pagination} /></div>;
}

export function ClientSalesHistory({ clientId }: { clientId: number }) {
  const displayCurrency = useUIStore((state) => state.displayCurrency);
  const query = useClientSalesHistory(clientId);
  const data = query.data;
  const timeline = useListPagination(data?.opportunities ?? []);

  if (query.isLoading) return <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading sales history...</CardContent></Card>;
  if (!data || query.error) return <Card><CardContent className="py-10 text-center text-sm text-destructive">Unable to load client sales history.</CardContent></Card>;
  const open = data.opportunities.filter((item) => !item.outcome);
  const won = data.opportunities.filter((item) => item.outcome === "WON");
  const lost = data.opportunities.filter((item) => item.outcome === "LOST");
  const automaticEvidence = data.revenueEvidence.state === "VERIFIED_COMPLETE";

  return <div className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><Card><CardHeader className="pb-2"><CardDescription>Confirmed sales recorded</CardDescription><CardTitle>{formatMoney(Number(data.confirmedSales.totalUsd), "USD", displayCurrency, Number(data.confirmedSales.conversionBasis.kesPerUsd))}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{data.confirmedSales.eligibleCount} Won opportunities with confirmed values{data.confirmedSales.missingConfirmedCount ? ` · ${data.confirmedSales.missingConfirmedCount} missing values` : ""}</CardContent></Card><Card><CardHeader className="pb-2"><CardDescription>Two-year revenue used for scoring</CardDescription><CardTitle>{data.revenueEvidence.amountUsd === null ? "Unavailable" : formatMoney(Number(data.revenueEvidence.amountUsd), "USD", displayCurrency, Number(data.confirmedSales.conversionBasis.kesPerUsd))}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{automaticEvidence ? "Automatically calculated from confirmed Won sales." : data.revenueEvidence.state === "UNKNOWN" ? "Missing history is not treated as zero." : "Verified zero sales history."}</CardContent></Card></div>{data.revenueEvidence.reviewReason && <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">{data.revenueEvidence.reviewReason}</p>}<Card><CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle>Opportunity and sales history</CardTitle><CardDescription>Estimated values remain separate from confirmed Won values.</CardDescription></div><Button asChild size="sm" variant="outline"><Link to="/dashboard/opportunities">Record a historical purchase</Link></Button></CardHeader><CardContent><Tabs defaultValue="won"><TabsList className="max-w-full overflow-x-auto"><TabsTrigger value="won">Won purchases ({won.length})</TabsTrigger><TabsTrigger value="open">Open ({open.length})</TabsTrigger><TabsTrigger value="lost">Lost ({lost.length})</TabsTrigger><TabsTrigger value="timeline">Timeline</TabsTrigger></TabsList><TabsContent value="open"><OpportunityTable opportunities={open} empty="No open opportunities." /></TabsContent><TabsContent value="won"><OpportunityTable opportunities={won} empty="No qualifying purchases are recorded." /></TabsContent><TabsContent value="lost"><OpportunityTable opportunities={lost} empty="No Lost opportunities." /></TabsContent><TabsContent value="timeline"><div className="space-y-3 pt-4">{!data.opportunities.length ? <p className="py-8 text-center text-sm text-muted-foreground">No opportunity history.</p> : timeline.visibleItems.map((item) => <div key={item.id} className="flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"><div><Link className="font-medium text-primary hover:underline" to={`/dashboard/opportunities/${item.id}`}>{item.title}</Link><p className="text-xs text-muted-foreground">Created {new Date(item.createdAt).toLocaleDateString()}</p></div><div className="text-sm sm:text-right"><p>{item.outcome ? `${item.outcome === "WON" ? "Won" : "Lost"} ${item.outcomeAt ? `on ${new Date(item.outcomeAt).toLocaleDateString()}` : ""}` : opportunityStageLabels[item.stage]}</p><p className="text-xs text-muted-foreground">{item.owner.firstName} {item.owner.lastName}</p></div></div>)}{data.opportunities.length > 0 && <TablePagination {...timeline.pagination} />}</div></TabsContent></Tabs></CardContent></Card></div>;
}
