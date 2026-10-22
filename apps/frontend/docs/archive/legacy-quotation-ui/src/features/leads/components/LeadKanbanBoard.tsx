import { useMemo, useCallback } from "react";
import {
  KanbanProvider,
  KanbanBoard,
  KanbanHeader,
  KanbanCards,
  KanbanCard,
} from "@/components/kibo-ui/kanban";
import type { DragEndEvent } from "@/components/kibo-ui/kanban";
import { Badge } from "@/components/ui/badge";
import { Lock, FileEdit, CircleDot, Trophy, XCircle } from "lucide-react";
import { useLeads, useUpdateLead } from "../hooks/useLeads";
import { LeadKanbanCard } from "./LeadKanbanCard";
import type { Lead, LeadStatus } from "@/features/leads/types";

interface LeadKanbanBoardProps {
  salesRepId?: number | null;
}

type KanbanColumn = {
  id: LeadStatus;
  name: string;
};

type KanbanLead = Omit<Lead, 'id'> & {
  id: string;
  leadId: number;
  name: string;
  column: LeadStatus;
};

const COLUMNS: KanbanColumn[] = [
  { id: "DRAFT", name: "Draft" },
  { id: "OPEN", name: "Open" },
  { id: "WON", name: "Won" },
  { id: "LOST", name: "Lost" },
];

const getColumnHeaderClass = (columnId: LeadStatus): string => {
  switch (columnId) {
    case "DRAFT":
      return "text-gray-700 dark:text-gray-300";
    case "OPEN":
      return "text-blue-700 dark:text-blue-300";
    case "WON":
      return "text-green-700 dark:text-green-300";
    case "LOST":
      return "text-red-700 dark:text-red-300";
    default:
      return "";
  }
};

const ColumnIcon = ({ columnId }: { columnId: LeadStatus }) => {
  const cls = "h-4 w-4";
  switch (columnId) {
    case "DRAFT":
      return <FileEdit className={cls} />;
    case "OPEN":
      return <CircleDot className={cls} />;
    case "WON":
      return <Trophy className={cls} />;
    case "LOST":
      return <XCircle className={cls} />;
    default:
      return null;
  }
};

export function LeadKanbanBoard({ salesRepId }: LeadKanbanBoardProps) {
  const params = salesRepId ? { salesRepId } : undefined;
  const { data, isLoading } = useLeads(params);
  const updateLeadMutation = useUpdateLead();

  const leads: KanbanLead[] = useMemo(
    () => (data?.leads || []).map((lead) => ({
      ...lead,
      id: String(lead.id),
      leadId: lead.id,
      name: lead.customer.companyName,
      column: lead.status,
    })),
    [data?.leads]
  );

  const canDrag = useCallback(
    (item: KanbanLead) => item.status !== "WON" && item.status !== "LOST",
    [],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over) return;

      const lead = leads.find((l) => l.id === active.id);
      if (!lead) return;

      if (lead.status === "WON" || lead.status === "LOST") return;

      const targetColumn = COLUMNS.find(col => 
        over.id === col.id || leads.some(l => l.id === over.id && l.column === col.id)
      );
      
      const newStatus = (targetColumn?.id || over.id) as LeadStatus;

      if (lead.status !== newStatus) {
        updateLeadMutation.mutate({
          id: lead.leadId,
          data: { status: newStatus },
        });
      }
    },
    [leads, updateLeadMutation]
  );

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading leads...
      </div>
    );
  }

  return (
    <div className="relative flex h-full bg-slate-50/50 dark:bg-zinc-950">
      <div className="flex-1 overflow-hidden">
        <KanbanProvider
          columns={COLUMNS}
          data={leads}
          canDrag={canDrag}
          onDragEnd={handleDragEnd}
        >
          {(column) => {
            const columnCount = leads.filter((l) => l.column === column.id).length;
            return (
              <KanbanBoard key={column.id} id={column.id}>
                <KanbanHeader className={getColumnHeaderClass(column.id)}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ColumnIcon columnId={column.id} />
                      <span className="font-semibold text-sm sm:text-base">{column.name}</span>
                      {(column.id === "WON" || column.id === "LOST") && (
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-xs font-semibold min-w-[2rem] justify-center"
                    >
                      {columnCount}
                    </Badge>
                  </div>
                </KanbanHeader>
                <KanbanCards id={column.id}>
                  {(lead) => (
                    <KanbanCard
                      key={lead.id}
                      id={lead.id}
                      name={lead.name}
                      column={lead.column}
                      locked={lead.status === "WON" || lead.status === "LOST"}
                    >
                      <LeadKanbanCard lead={lead as unknown as Lead} />
                    </KanbanCard>
                  )}
                </KanbanCards>
              </KanbanBoard>
            );
          }}
        </KanbanProvider>
      </div>
    </div>
  );
}
