import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Filter, X } from "lucide-react";
import { useInteractions } from "@/features/interactions/hooks/useInteractions";
import { CreateInteractionWizard } from "@/features/interactions/components/CreateInteractionWizard";
import { EditInteractionDialog } from "@/features/interactions/components/EditInteractionDialog";
import { InteractionDetailDialog } from "@/features/interactions/components/InteractionDetailDialog";
import { InteractionList } from "@/features/interactions/components/InteractionList";
import { InteractionFilters } from "@/features/interactions/components/InteractionFilters";
import type { ListInteractionsParams, InteractionType } from "@/features/interactions/types";
import { Badge } from "@/components/ui/badge";
import { useFilterStore } from "@/stores/useFilterStore";
import { FilterBadge } from "@/components/shared/FilterBadge";

const FILTER_KEY = "interactions";

export default function Interactions() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedInteractionId, setSelectedInteractionId] = useState<number | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const { filters: storedFilters } = useFilterStore();
  const activeFilters = useMemo(() => storedFilters[FILTER_KEY] || [], [storedFilters]);

  const backendFilters = useMemo<ListInteractionsParams>(() => {
    const params: ListInteractionsParams = {};
    activeFilters.forEach((filter) => {
      if (filter.field === "type") params.type = filter.value as InteractionType;
      if (filter.field === "salesRepId") params.salesRepId = Number(filter.value);
      if (filter.field === "customerId") params.customerId = Number(filter.value);
      if (filter.field === "startDate") params.startDate = filter.value as string;
      if (filter.field === "endDate") params.endDate = filter.value as string;
    });
    return params;
  }, [activeFilters]);

  const { data, isLoading } = useInteractions(backendFilters);

  const handleEdit = (id: number) => {
    setSelectedInteractionId(id);
    setIsEditDialogOpen(true);
  };

  const handleViewDetails = (id: number) => {
    setSelectedInteractionId(id);
    setIsDetailDialogOpen(true);
  };

  const getFilterLabel = (field: string) => {
    const labelMap: Record<string, string> = {
      type: "Interaction Type",
      salesRepId: "Sales Rep",
      customerId: "Customer",
      startDate: "Start Date",
      endDate: "End Date",
    };
    return labelMap[field] || field;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Interactions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track customer communications and touchpoints
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setIsFilterModalOpen(true)}
            className="relative"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFilters.length > 0 && (
              <Badge
                variant="default"
                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
              >
                {activeFilters.length}
              </Badge>
            )}
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Interaction
          </Button>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {activeFilters.map((filter) => (
            <FilterBadge
              key={filter.field}
              condition={filter}
              label={getFilterLabel(filter.field)}
              onRemove={() => {
                const { removeFilter } = useFilterStore.getState();
                removeFilter(FILTER_KEY, filter.field);
              }}
            />
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const { clearFilters } = useFilterStore.getState();
              clearFilters(FILTER_KEY);
            }}
            className="h-7 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        </div>
      )}

      <InteractionFilters
        open={isFilterModalOpen}
        onOpenChange={setIsFilterModalOpen}
        filterKey={FILTER_KEY}
      />

      <InteractionList
        interactions={data?.interactions || []}
        isLoading={isLoading}
        onEdit={handleEdit}
        onViewDetails={handleViewDetails}
      />

      <CreateInteractionWizard
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
      
      {selectedInteractionId && (
        <>
          <EditInteractionDialog
            interactionId={selectedInteractionId}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
          />
          <InteractionDetailDialog
            interactionId={selectedInteractionId}
            open={isDetailDialogOpen}
            onOpenChange={setIsDetailDialogOpen}
          />
        </>
      )}
    </div>
  );
}
