import { useState, useMemo } from "react";
import { useAuditLogs } from "@/features/audit-logs/hooks/useAuditLogs";
import { AuditLogDetailDialog } from "@/features/audit-logs/components/AuditLogDetailDialog";
import { AuditLogList } from "@/features/audit-logs/components/AuditLogList";
import { AuditLogFilters } from "@/features/audit-logs/components/AuditLogFilters";
import { useAuth } from "@/app/auth/useAuth";
import type { ListAuditLogsParams } from "@/features/audit-logs/types";
import { useFilterStore } from "@/stores/useFilterStore";
import { FilterBadge } from "@/components/shared/FilterBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, X, ChevronLeft, ChevronRight } from "lucide-react";

const FILTER_KEY = "audit-logs";

export default function AuditLogs() {
  const { user } = useAuth();
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  const { filters: storedFilters } = useFilterStore();
  const activeFilters = useMemo(() => storedFilters[FILTER_KEY] || [], [storedFilters]);

  const backendFilters = useMemo<ListAuditLogsParams>(() => {
    const params: ListAuditLogsParams = {
      page: currentPage,
      limit: pageSize,
    };
    activeFilters.forEach((filter) => {
      if (filter.field === "userId") params.userId = Number(filter.value);
      if (filter.field === "action") params.action = filter.value as string;
      if (filter.field === "startDate") params.startDate = new Date(filter.value as string).toISOString();
      if (filter.field === "endDate") params.endDate = new Date(filter.value as string).toISOString();
    });
    return params;
  }, [activeFilters, currentPage, pageSize]);

  const { data, isLoading } = useAuditLogs(backendFilters);

  const handleViewDetails = (id: number) => {
    setSelectedLogId(id);
    setIsDetailDialogOpen(true);
  };

  const getFilterLabel = (field: string) => {
    const labelMap: Record<string, string> = {
      userId: "User",
      action: "Action",
      startDate: "Start Date",
      endDate: "End Date",
    };
    return labelMap[field] || field;
  };

  const isAdmin = user?.roleId === 1;

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-muted-foreground">Access Denied</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Only administrators can view audit logs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View system activity and user actions
          </p>
        </div>
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
              setCurrentPage(1);
            }}
            className="h-7 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        </div>
      )}

      <AuditLogList
        logs={data?.logs || []}
        isLoading={isLoading}
        onViewDetails={handleViewDetails}
      />

      {data && data.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, data.total)} of {data.total} logs
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                let pageNum;
                if (data.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= data.totalPages - 2) {
                  pageNum = data.totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-9 h-9 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(data.totalPages, p + 1))}
              disabled={currentPage === data.totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <AuditLogFilters 
        filterKey={FILTER_KEY}
        open={isFilterModalOpen}
        onOpenChange={setIsFilterModalOpen}
      />

      {selectedLogId && (
        <AuditLogDetailDialog
          logId={selectedLogId}
          open={isDetailDialogOpen}
          onOpenChange={setIsDetailDialogOpen}
        />
      )}
    </div>
  );
}
