import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, type DisplayCurrency } from "@/lib/currency";
import type { Opportunity } from "../services/opportunitiesApi";
import { opportunityStageClass, opportunityStageLabels } from "../utils/labels";
import { ArrowRight, Pencil } from "lucide-react";

export function OpportunityListView({ opportunities, displayCurrency, onEdit, onChangeStage }: { opportunities: Opportunity[]; displayCurrency: DisplayCurrency; onEdit: (opportunity: Opportunity) => void; onChangeStage: (opportunity: Opportunity) => void }) {
  return <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
    <Table>
      <TableHeader><TableRow><TableHead>Opportunity</TableHead><TableHead>Account</TableHead><TableHead>Amount</TableHead><TableHead>Stage</TableHead><TableHead>Owner</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
      <TableBody>{opportunities.map((opportunity) => <TableRow key={opportunity.id}>
        <TableCell className="font-medium"><Link className="text-primary hover:underline" to={`/dashboard/opportunities/${opportunity.id}`}>{opportunity.title}</Link></TableCell>
        <TableCell>{opportunity.account.businessName}</TableCell>
        <TableCell>{formatMoney(Number(opportunity.estimatedAmount), opportunity.currency, displayCurrency)}</TableCell>
        <TableCell><div className="flex flex-wrap gap-1"><Badge className={opportunityStageClass[opportunity.stage]} variant="outline">{opportunityStageLabels[opportunity.stage]}</Badge>{opportunity.outcome && <Badge variant={opportunity.outcome === "WON" ? "default" : "destructive"}>{opportunity.outcome === "WON" ? "Won" : "Lost"}</Badge>}</div></TableCell>
        <TableCell>{opportunity.owner.firstName} {opportunity.owner.lastName}</TableCell>
        <TableCell><div className="flex justify-end gap-1"><Button size="sm" variant="ghost" onClick={() => onEdit(opportunity)}><Pencil className="mr-1 h-4 w-4" />Edit</Button><Button size="sm" variant="outline" onClick={() => onChangeStage(opportunity)} disabled={opportunity.stage === "CLOSED"}><ArrowRight className="mr-1 h-4 w-4" />Change stage</Button></div></TableCell>
      </TableRow>)}</TableBody>
    </Table>
  </div>;
}
