import { useState } from "react";
import { useQuotations, useDeleteQuotation } from "@/features/quotations/hooks/useQuotations";
import { useQuotationsStore } from "@/features/quotations/store/quotationsStore";
import { useAuth } from "@/app/auth/useAuth";
import { useFilterStore } from "@/stores/useFilterStore";
import { useClientFiltering } from "@/hooks/useClientFiltering";
import { useSorting } from "@/hooks/useSorting";
import { usePagination } from "@/hooks/usePagination";
import { ColumnFilter } from "@/components/shared/ColumnFilter";
import { FilterBadge } from "@/components/shared/FilterBadge";
import { SortableTableHead } from "@/components/shared/SortableTableHead";
import { TablePagination } from "@/components/shared/TablePagination";
import { quotationFilterConfigs } from "@/features/quotations/config/filterConfig";
import type { FilterCondition } from "@/lib/filtering/types";
import { CreateQuotationDialog } from "@/features/quotations/components/CreateQuotationDialog";
import { EditQuotationDialog } from "@/features/quotations/components/EditQuotationDialog";
import { QuotationDetailDialog } from "@/features/quotations/components/QuotationDetailDialog";
import { VersionHistoryDialog } from "@/features/quotations/components/VersionHistoryDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Plus, MoreVertical, Eye, Edit, Trash2, History as HistoryIcon, Copy, X } from "lucide-react";
import type { Quotation } from "@/types/quotation";

const FILTER_KEY = "quotations";

export default function Quotations() {
  const { user } = useAuth();
  const { data, isLoading } = useQuotations();
  const deleteQuotationMutation = useDeleteQuotation();
  const { openCreateDialog, openEditDialog, openDetailDialog, openVersionHistoryDialog } = useQuotationsStore();
  const [deletingQuotation, setDeletingQuotation] = useState<Quotation | null>(null);

  const isAdmin = user?.roleId === 1;

  const { filters, addFilter, removeFilter, clearFilters } = useFilterStore();
  const activeFilters = filters[FILTER_KEY] || [];

  const allQuotations = data?.quotations || [];
  const filtered = useClientFiltering(allQuotations, activeFilters);
  const { sortedData: sortedQuotations, handleSort, getSortIcon } = useSorting<Quotation>(filtered);
  
  const {
    paged: filteredQuotations,
    page,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
  } = usePagination(sortedQuotations, { initialPageSize: 10 });

  const handleDelete = async () => {
    if (!deletingQuotation) return;
    await deleteQuotationMutation.mutateAsync(deletingQuotation.id);
    setDeletingQuotation(null);
  };

  const handleFilterChange = (field: string, condition: FilterCondition | null) => {
    if (condition) {
      addFilter(FILTER_KEY, condition);
    } else {
      removeFilter(FILTER_KEY, field);
    }
  };

  const getFilterConfig = (field: string) => {
    return quotationFilterConfigs.find((config) => String(config.field) === field);
  };

  const getFilterLabel = (field: string) => {
    const config = getFilterConfig(field);
    return config?.label || field;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT": return "bg-gray-500";
      case "SENT": return "bg-blue-500";
      case "ACCEPTED": return "bg-green-500";
      case "REJECTED": return "bg-red-500";
      case "SUPERSEDED": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quotations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage quotations with version control
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={openCreateDialog}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Quotation
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
              onRemove={() => removeFilter(FILTER_KEY, filter.field)}
            />
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearFilters(FILTER_KEY)}
            className="h-7 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading quotations...
        </div>
      ) : sortedQuotations.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {allQuotations.length === 0 
            ? "No quotations found. Create your first quotation to get started."
            : "No quotations match your filters. Try adjusting your search criteria."}
        </div>
      ) : (
        <div className="border rounded-lg bg-card overflow-hidden">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <span>Quote Number</span>
                    <ColumnFilter
                      config={quotationFilterConfigs[0]}
                      value={activeFilters.find((f) => f.field === "quoteNumber")}
                      onChange={(condition) => handleFilterChange("quoteNumber", condition)}
                    />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <span>Version</span>
                    <ColumnFilter
                      config={quotationFilterConfigs[1]}
                      value={activeFilters.find((f) => f.field === "version")}
                      onChange={(condition) => handleFilterChange("version", condition)}
                    />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <span>Customer</span>
                    <ColumnFilter
                      config={quotationFilterConfigs[2]}
                      value={activeFilters.find((f) => f.field === "customer.companyName")}
                      onChange={(condition) => handleFilterChange("customer.companyName", condition)}
                    />
                  </div>
                </TableHead>
                <SortableTableHead
                  field="totalPrice"
                  label="Total Price"
                  sortDirection={getSortIcon("totalPrice")}
                  onSort={handleSort}
                >
                  <ColumnFilter
                    config={quotationFilterConfigs[3]}
                    value={activeFilters.find((f) => f.field === "totalPrice")}
                    onChange={(condition) => handleFilterChange("totalPrice", condition)}
                  />
                </SortableTableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <span>Status</span>
                    <ColumnFilter
                      config={quotationFilterConfigs[4]}
                      value={activeFilters.find((f) => f.field === "status")}
                      onChange={(condition) => handleFilterChange("status", condition)}
                    />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <span>Sales Rep</span>
                    <ColumnFilter
                      config={quotationFilterConfigs[5]}
                      value={activeFilters.find((f) => f.field === "salesRep.firstName")}
                      onChange={(condition) => handleFilterChange("salesRep.firstName", condition)}
                    />
                  </div>
                </TableHead>
                <SortableTableHead
                  field="createdAt"
                  label="Created"
                  sortDirection={getSortIcon("createdAt")}
                  onSort={handleSort}
                >
                  <ColumnFilter
                    config={quotationFilterConfigs[6]}
                    value={activeFilters.find((f) => f.field === "createdAt")}
                    onChange={(condition) => handleFilterChange("createdAt", condition)}
                  />
                </SortableTableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotations.map((quotation) => (
                <TableRow key={quotation.id}>
                  <TableCell className="font-medium">
                    {quotation.quoteNumber}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">v{quotation.version}</Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{quotation.customer.companyName}</div>
                      <div className="text-sm text-muted-foreground">
                        {quotation.customer.countyName}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-primary">
                    KES {Number(quotation.totalPrice).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(quotation.status)}>
                      {quotation.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {quotation.salesRep.firstName} {quotation.salesRep.lastName}
                  </TableCell>
                  <TableCell>
                    {new Date(quotation.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetailDialog(quotation)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openVersionHistoryDialog(quotation)}>
                            <HistoryIcon className="h-4 w-4 mr-2" />
                            Version History
                          </DropdownMenuItem>
                          {quotation.status === "DRAFT" && (
                            <DropdownMenuItem onClick={() => openEditDialog(quotation)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {quotation.status !== "DRAFT" && quotation.status !== "SUPERSEDED" && (
                            <DropdownMenuItem onClick={() => openVersionHistoryDialog(quotation)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Create New Version
                            </DropdownMenuItem>
                          )}
                          {isAdmin && quotation.status === "DRAFT" && (
                            <DropdownMenuItem
                              onClick={() => setDeletingQuotation(quotation)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
          <TablePagination
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            totalCount={sortedQuotations.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      <CreateQuotationDialog />
      <EditQuotationDialog />
      <QuotationDetailDialog />
      <VersionHistoryDialog />

      <AlertDialog open={!!deletingQuotation} onOpenChange={() => setDeletingQuotation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quotation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete quotation {deletingQuotation?.quoteNumber} v{deletingQuotation?.version}?
              <br /><br />
              <span className="text-sm font-medium">Note:</span> Only DRAFT quotations that are the latest version can be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
