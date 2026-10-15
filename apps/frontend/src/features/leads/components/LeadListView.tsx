import { useState, useMemo, useCallback, memo } from "react";
import { ChevronDown, ChevronRight, Lock, MoveRight } from "lucide-react";
import { useLeads, useUpdateLead } from "../hooks/useLeads";
import { LeadKanbanCard } from "./LeadKanbanCard";
import type { LeadStatus, Lead } from "../types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "OPEN", label: "Open" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

// Memoized list item component to prevent unnecessary re-renders
interface LeadListItemProps {
  lead: Lead;
  onStatusChange: (lead: Lead, newStatus: LeadStatus) => void;
}

const isStatusLocked = (status: LeadStatus): boolean =>
  status === "WON" || status === "LOST";

const LeadListItem = memo(({ lead, onStatusChange }: LeadListItemProps) => (
  <div className="p-3 rounded-lg border bg-background space-y-3">
    <LeadKanbanCard lead={lead} />
    {isStatusLocked(lead.status) ? (
      <div className="flex items-center justify-center gap-2 h-8 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        <span>Status locked ({lead.status.toLowerCase()})</span>
      </div>
    ) : (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="w-full h-8 text-xs">
            <MoveRight className="h-3 w-3 mr-2" />
            Change Status
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-48">
          {STATUSES.filter((s) => s.value !== lead.status).map((status) => (
            <DropdownMenuItem
              key={status.value}
              onClick={() => onStatusChange(lead, status.value)}
            >
              {status.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )}
  </div>
));

LeadListItem.displayName = "LeadListItem";

interface LeadListViewProps {
  salesRepId?: number | null;
}

export function LeadListView({ salesRepId }: LeadListViewProps) {
  const params = salesRepId ? { salesRepId } : undefined;
  const { data, isLoading } = useLeads(params);
  const updateLeadMutation = useUpdateLead();
  const [expandedSections, setExpandedSections] = useState<Set<LeadStatus>>(
    new Set(["OPEN", "DRAFT"])
  );

  const handleStatusChange = useCallback(
    (lead: Lead, newStatus: LeadStatus) => {
      updateLeadMutation.mutate({
        id: lead.id,
        data: { status: newStatus },
      });
    },
    [updateLeadMutation]
  );

  const toggleSection = useCallback((status: LeadStatus) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }, []);

  // Memoize grouped leads to prevent recalculation on every render
  const groupedLeads = useMemo(
    () => {
      const leads = data?.leads || [];
      return STATUSES.map((status) => ({
        status,
        leads: leads.filter((lead) => lead.status === status.value),
      }));
    },
    [data?.leads]
  );

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading leads...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groupedLeads.map(({ status, leads: statusLeads }) => {
        const isExpanded = expandedSections.has(status.value);

        return (
          <div key={status.value} className="rounded-lg border bg-card">
            <Button
              variant="ghost"
              className="w-full justify-between p-4 h-auto font-semibold"
              onClick={() => toggleSection(status.value)}
            >
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span>{status.label}</span>
                <span className="text-sm font-normal text-muted-foreground">
                  ({statusLeads.length})
                </span>
              </div>
            </Button>

            {isExpanded && (
              <div className="p-4 pt-0 space-y-3">
                {statusLeads.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No leads in this status
                  </p>
                ) : (
                  statusLeads.map((lead) => (
                    <LeadListItem
                      key={lead.id}
                      lead={lead}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
