import { Link } from "react-router-dom";
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
  type DragEndEvent,
} from "@/components/kibo-ui/kanban";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatMoney, type DisplayCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Pencil } from "lucide-react";
import type { Opportunity, OpportunityStage } from "../services/opportunitiesApi";
import { opportunityStageClass, opportunityStageLabels } from "../utils/labels";
import { OpportunityScoreBadge } from "./OpportunityScoreBadge";

type KanbanOpportunity = Omit<Opportunity, "id"> & {
  id: string;
  opportunityId: number;
  name: string;
  column: OpportunityStage;
};

const columns = (Object.keys(opportunityStageLabels) as OpportunityStage[]).map((id) => ({
  id,
  name: opportunityStageLabels[id],
}));

export function OpportunityKanbanBoard({ opportunities, displayCurrency, onEdit, onStageDrop, movingId }: { opportunities: Opportunity[]; displayCurrency: DisplayCurrency; onEdit: (opportunity: Opportunity) => void; onStageDrop: (opportunity: Opportunity, stage: OpportunityStage) => void; movingId?: number }) {
  const cards: KanbanOpportunity[] = opportunities.map((opportunity) => ({
    ...opportunity,
    id: String(opportunity.id),
    opportunityId: opportunity.id,
    name: opportunity.title,
    column: opportunity.stage,
  }));

  const handleDragEnd = (event: DragEndEvent) => {
    if (!event.over) return;
    const card = cards.find((item) => item.id === event.active.id);
    const target = columns.find((column) => column.id === event.over?.id)?.id ?? cards.find((item) => item.id === event.over?.id)?.column;
    const opportunity = card && opportunities.find((item) => item.id === card.opportunityId);
    if (opportunity && target && target !== opportunity.stage) onStageDrop(opportunity, target);
  };

  return <div className="overflow-x-auto pb-2">
    <KanbanProvider className="min-w-[1100px]" columns={columns} data={cards} canDrag={(item) => item.stage !== "CLOSED" && movingId === undefined} onDragEnd={handleDragEnd}>
      {(column) => {
        const count = cards.filter((card) => card.column === column.id).length;
        return <KanbanBoard key={column.id} id={column.id} className="min-h-[260px] bg-slate-50 dark:bg-slate-950">
          <KanbanHeader className="bg-card">
            <div className="flex items-center justify-between gap-2">
              <span>{column.name}</span>
              <Badge variant="secondary">{count}</Badge>
            </div>
          </KanbanHeader>
          <KanbanCards<KanbanOpportunity> id={column.id} className="min-h-[210px]">
            {(opportunity) => <KanbanCard key={opportunity.id} {...opportunity} locked={opportunity.stage === "CLOSED" || movingId !== undefined} className="bg-card p-3">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Link className="font-semibold text-foreground hover:text-primary hover:underline" onPointerDown={(event) => event.stopPropagation()} to={`/dashboard/opportunities/${opportunity.opportunityId}`}>{opportunity.title}</Link>
                  <p className="text-xs text-muted-foreground">{opportunity.client.businessName}</p>
                </div>
                <div className="flex flex-wrap gap-1"><Badge className={opportunityStageClass[opportunity.stage]} variant="outline">{opportunityStageLabels[opportunity.stage]}</Badge>{opportunity.outcome && <Badge variant={opportunity.outcome === "WON" ? "default" : "destructive"}>{opportunity.outcome === "WON" ? "Won" : "Lost"}</Badge>}</div>
                <p className="text-sm font-semibold">{formatMoney(Number(opportunity.estimatedAmount), opportunity.currency, displayCurrency)}</p>
                <OpportunityScoreBadge prediction={opportunity.latestPrediction ?? null} />
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{opportunity.estimatedCloseAt ? new Date(opportunity.estimatedCloseAt).toLocaleDateString() : "No close date"}</span>
                  <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px]">{opportunity.owner.firstName[0]}{opportunity.owner.lastName[0]}</AvatarFallback></Avatar>
                </div>
                <div onPointerDown={(event) => event.stopPropagation()}>
                  <Select
                    value={opportunity.stage}
                    onValueChange={(value) =>
                      onStageDrop(
                        opportunities.find((item) => item.id === opportunity.opportunityId)!,
                        value as OpportunityStage,
                      )
                    }
                    disabled={opportunity.stage === "CLOSED" || movingId !== undefined}
                  >
                    <SelectTrigger className="h-8 w-full text-xs" aria-label={`Move ${opportunity.title} to stage`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {columns
                        .slice(columns.findIndex((column) => column.id === opportunity.stage))
                        .map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.id === opportunity.stage ? `Current: ${stage.name}` : `Move to ${stage.name}`}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" size="sm" variant="outline" onPointerDown={(event) => event.stopPropagation()} onClick={() => onEdit(opportunities.find((item) => item.id === opportunity.opportunityId)!)}><Pencil className="mr-2 h-3.5 w-3.5" />Edit details</Button>
              </div>
            </KanbanCard>}
          </KanbanCards>
        </KanbanBoard>;
      }}
    </KanbanProvider>
  </div>;
}
