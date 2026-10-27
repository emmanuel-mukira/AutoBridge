import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { LeadKanbanBoard } from "@/features/leads/components/LeadKanbanBoard";
import { LeadListView } from "@/features/leads/components/LeadListView";
import { CreateLeadDialog } from "@/features/leads/components/CreateLeadDialog";
import { EditLeadDialog } from "@/features/leads/components/EditLeadDialog";
import { LeadDetailDialog } from "@/features/leads/components/LeadDetailDialog";
import { SalesRepFilter } from "@/features/leads/components/SalesRepFilter";
import { useLeadsStore } from "@/features/leads/store/leadsStore";
import { useAuth } from "@/app/auth/useAuth";

export default function Leads() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const openCreateDialog = useLeadsStore((state) => state.openCreateDialog);
  const [selectedSalesRepId, setSelectedSalesRepId] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your sales pipeline
          </p>
        </div>
        <Button 
          onClick={openCreateDialog}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Lead
        </Button>
      </div>

      {isAdmin && (
        <SalesRepFilter
          value={selectedSalesRepId}
          onChange={setSelectedSalesRepId}
        />
      )}

      {/* Desktop: Kanban Board */}
      <div className="hidden md:block">
        <LeadKanbanBoard salesRepId={selectedSalesRepId} />
      </div>

      {/* Mobile: List View */}
      <div className="block md:hidden">
        <LeadListView salesRepId={selectedSalesRepId} />
      </div>

      <CreateLeadDialog />
      <EditLeadDialog />
      <LeadDetailDialog />
    </div>
  );
}
