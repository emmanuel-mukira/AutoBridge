import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUIStore } from "@/app/store";
import { formatMoney } from "@/lib/currency";
import { OpportunityDialog } from "@/features/opportunities/components/OpportunityDialog";
import { ConfirmedSaleDialog } from "@/features/opportunities/components/ConfirmedSaleDialog";
import { OpportunityPredictionCard } from "@/features/opportunities/components/OpportunityPredictionCard";
import { useOpportunity } from "@/features/opportunities/hooks/useOpportunities";
import { opportunityStageClass, opportunityStageLabels, salesRouteLabels } from "@/features/opportunities/utils/labels";
import { Building2, CalendarDays, CircleDollarSign, Pencil, UserRound } from "lucide-react";
import { ActivitySection } from "@/features/activities/components/ActivitySection";

export default function OpportunityDetails() {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmedSaleOpen, setConfirmedSaleOpen] = useState(false);
  const id = Number(useParams<{ id: string }>().id);
  const displayCurrency = useUIStore((state) => state.displayCurrency);
  const { data: opportunity, isLoading, error } = useOpportunity(id);
  return <section className="space-y-4">
    <Link className="text-primary hover:underline" to="/dashboard/opportunities">← Opportunities</Link>
    {isLoading && <p>Loading opportunity...</p>}
    {error && <p role="alert" className="text-destructive">Opportunity not found or access denied.</p>}
    {opportunity && <><Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2"><CardTitle className="text-2xl">{opportunity.title}</CardTitle><Link className="flex items-center gap-2 text-sm text-primary hover:underline" to={`/dashboard/clients/${opportunity.client.id}`}><Building2 className="h-4 w-4" />{opportunity.client.businessName}</Link></div>
        <div className="flex flex-col gap-2 sm:flex-row">{opportunity.outcome === "WON" && <Button variant="outline" onClick={() => setConfirmedSaleOpen(true)}><CircleDollarSign className="mr-2 h-4 w-4" />{opportunity.confirmedAmount ? "Correct sale value" : "Record sale value"}</Button>}<Button onClick={() => setEditOpen(true)}><Pencil className="mr-2 h-4 w-4" />Edit opportunity</Button></div>
      </CardHeader>
      <CardContent className="border-t pt-6"><dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div><dt className="text-sm text-muted-foreground">Estimated amount</dt><dd className="mt-1 text-lg font-semibold">{formatMoney(Number(opportunity.estimatedAmount), opportunity.currency, displayCurrency)}</dd><dd className="text-xs text-muted-foreground">Stored as {opportunity.currency} {opportunity.estimatedAmount}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Pipeline stage</dt><dd className="mt-2 flex flex-wrap gap-1"><Badge className={opportunityStageClass[opportunity.stage]} variant="outline">{opportunityStageLabels[opportunity.stage]}</Badge>{opportunity.outcome && <Badge variant={opportunity.outcome === "WON" ? "default" : "destructive"}>{opportunity.outcome === "WON" ? "Won" : "Lost"}</Badge>}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Owner</dt><dd className="mt-1 flex items-center gap-2 font-medium"><UserRound className="h-4 w-4 text-muted-foreground" />{opportunity.owner.firstName} {opportunity.owner.lastName}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Route to market</dt><dd className="mt-1 font-medium">{opportunity.routeToMarket ? salesRouteLabels[opportunity.routeToMarket] : "Not selected"}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Product</dt><dd className="mt-1 font-medium">{opportunity.productSubgroup ? `${opportunity.productSubgroup.productGroup.name} — ${opportunity.productSubgroup.name}` : "Not selected"}</dd></div>
        <div><dt className="text-sm text-muted-foreground">Estimated close</dt><dd className="mt-1 flex items-center gap-2 font-medium"><CalendarDays className="h-4 w-4 text-muted-foreground" />{opportunity.estimatedCloseAt ? new Date(opportunity.estimatedCloseAt).toLocaleDateString() : "Not set"}</dd></div>
        {opportunity.outcome && <div><dt className="text-sm text-muted-foreground">Outcome date</dt><dd className="mt-1 font-medium">{opportunity.outcomeAt ? new Date(opportunity.outcomeAt).toLocaleDateString() : "Not recorded"}</dd></div>}
        {opportunity.outcome === "WON" && <div><dt className="text-sm text-muted-foreground">Confirmed sale value</dt><dd className="mt-1 text-lg font-semibold">{opportunity.confirmedAmount && opportunity.confirmedCurrency ? formatMoney(Number(opportunity.confirmedAmount), opportunity.confirmedCurrency, displayCurrency) : "Not recorded"}</dd>{opportunity.confirmedAmount && opportunity.confirmedCurrency && <dd className="text-xs text-muted-foreground">Stored as {opportunity.confirmedCurrency} {opportunity.confirmedAmount}</dd>}</div>}
      </dl></CardContent>
    </Card><OpportunityPredictionCard opportunity={opportunity} /><ActivitySection clientId={opportunity.clientId} opportunityId={opportunity.id} /><OpportunityDialog open={editOpen} onOpenChange={setEditOpen} opportunity={opportunity} /><ConfirmedSaleDialog opportunity={opportunity} open={confirmedSaleOpen} onOpenChange={setConfirmedSaleOpen} /></>}
  </section>;
}
