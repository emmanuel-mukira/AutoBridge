import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, MoreVertical, Pencil, Trash2, UserCog, Users, X } from "lucide-react";
import { getCategoryLabel, getCategoryIcon } from "@/features/customers/utils/categoryUtils";
import { useCustomers, useDeleteCustomer } from "@/features/customers/hooks/useCustomers";
import type { Customer } from "@/features/customers/types/index";
import { useAuth } from "@/app/auth/useAuth";
import { useFilterStore } from "@/stores/useFilterStore";
import { useClientFiltering } from "@/hooks/useClientFiltering";
import { useSorting } from "@/hooks/useSorting";
import { usePagination } from "@/hooks/usePagination";
import { ColumnFilter } from "@/components/shared/ColumnFilter";
import { FilterBadge } from "@/components/shared/FilterBadge";
import { SortableTableHead } from "@/components/shared/SortableTableHead";
import { TablePagination } from "@/components/shared/TablePagination";
import { customerFilterConfigs } from "@/features/customers/config/filterConfig";
import type { FilterCondition } from "@/lib/filtering/types";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CreateCustomerDialog } from "@/features/customers/components/CreateCustomerDialog";
import { AssignSalesRepDialog } from "@/features/customers/components/AssignSalesRepDialog";
import { CustomerContactsDialog } from "@/features/customers/components/CustomerContactsDialog";

const FILTER_KEY = "customers";

export default function Customers() {
  const { user } = useAuth();
  const { data: customersData, isLoading } = useCustomers({});
  const deleteCustomerMutation = useDeleteCustomer();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [assigningCustomer, setAssigningCustomer] = useState<Customer | null>(null);
  const [contactsCustomer, setContactsCustomer] = useState<Customer | null>(null);

  const isAdmin = user?.groups.includes("admin") ?? false;

  const { filters, addFilter, removeFilter, clearFilters } = useFilterStore();
  const activeFilters = filters[FILTER_KEY] || [];

  const allCustomers = customersData?.customers || [];
  const filteredCustomers = useClientFiltering(allCustomers, activeFilters);
  const { sortedData: sortedCustomers, handleSort, getSortIcon } = useSorting<Customer>(filteredCustomers);
  
  const {
    paged: customers,
    page,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
  } = usePagination(sortedCustomers, { initialPageSize: 10 });

  const handleDelete = () => {
    if (deletingCustomer) {
      deleteCustomerMutation.mutate(deletingCustomer.id);
      setDeletingCustomer(null);
    }
  };

  const handleFilterChange = (field: string, condition: FilterCondition | null) => {
    if (condition) {
      addFilter(FILTER_KEY, condition);
    } else {
      removeFilter(FILTER_KEY, field);
    }
  };

  const getFilterConfig = (field: string) => {
    return customerFilterConfigs.find((config) => String(config.field) === field);
  };

  const getFilterLabel = (field: string) => {
    const config = getFilterConfig(field);
    return config?.label || field;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your customer database
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Customer
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

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            Loading customers...
          </div>
        ) : sortedCustomers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No customers found. Create your first customer to get started.
          </div>
        ) : (
          <>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <span>Company Name</span>
                    <ColumnFilter
                      config={customerFilterConfigs[0]}
                      value={activeFilters.find((f) => f.field === "companyName")}
                      onChange={(condition) => handleFilterChange("companyName", condition)}
                    />
                  </div>
                </TableHead>
                <SortableTableHead
                  field="category"
                  label="Category"
                  sortDirection={getSortIcon("category")}
                  onSort={handleSort}
                >
                  <ColumnFilter
                    config={customerFilterConfigs[4]}
                    value={activeFilters.find((f) => f.field === "category")}
                    onChange={(condition) => handleFilterChange("category", condition)}
                  />
                </SortableTableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    <span>County</span>
                    <ColumnFilter
                      config={customerFilterConfigs[1]}
                      value={activeFilters.find((f) => f.field === "countyName")}
                      onChange={(condition) => handleFilterChange("countyName", condition)}
                    />
                  </div>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <div className="flex items-center gap-1">
                    <span>Location</span>
                    <ColumnFilter
                      config={customerFilterConfigs[2]}
                      value={activeFilters.find((f) => f.field === "locationAddress")}
                      onChange={(condition) => handleFilterChange("locationAddress", condition)}
                    />
                  </div>
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  <div className="flex items-center gap-1">
                    <span>Sales Rep</span>
                    <ColumnFilter
                      config={customerFilterConfigs[3]}
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
                  className="hidden xl:table-cell"
                >
                  <ColumnFilter
                    config={customerFilterConfigs[5]}
                    value={activeFilters.find((f) => f.field === "createdAt")}
                    onChange={(condition) => handleFilterChange("createdAt", condition)}
                  />
                </SortableTableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer: Customer) => {
                const CategoryIcon = getCategoryIcon(customer.category);
                return (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">
                    <Link
                      to={`/dashboard/customers/${customer.id}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {customer.companyName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{getCategoryLabel(customer.category)}</span>
                    </div>
                  </TableCell>
                  <TableCell>{customer.countyName}</TableCell>
                  <TableCell className="hidden md:table-cell">{customer.locationAddress}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {customer.salesRep
                      ? `${customer.salesRep.firstName} ${customer.salesRep.lastName}`
                      : "Unassigned"}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
                    {new Date(customer.createdAt).toLocaleDateString()}
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
                          <DropdownMenuItem onClick={() => setContactsCustomer(customer)}>
                            <Users className="h-4 w-4 mr-2" />
                            Manage Contacts
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingCustomer(customer)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem onClick={() => setAssigningCustomer(customer)}>
                              <UserCog className="h-4 w-4 mr-2" />
                              Assign Sales Rep
                            </DropdownMenuItem>
                          )}
                          {isAdmin && (
                            <DropdownMenuItem
                              onClick={() => setDeletingCustomer(customer)}
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
                );
              })}
            </TableBody>
          </Table>
          </div>
          <TablePagination
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            totalCount={sortedCustomers.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
          </>
        )}
      </div>

      <CreateCustomerDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {editingCustomer && (
        <CreateCustomerDialog
          open={!!editingCustomer}
          onOpenChange={(open) => !open && setEditingCustomer(null)}
          customer={editingCustomer}
        />
      )}

      <AssignSalesRepDialog
        open={!!assigningCustomer}
        onOpenChange={(open) => !open && setAssigningCustomer(null)}
        customer={assigningCustomer}
      />

      <CustomerContactsDialog
        open={!!contactsCustomer}
        onOpenChange={(open) => !open && setContactsCustomer(null)}
        customer={contactsCustomer}
      />

      <AlertDialog open={!!deletingCustomer} onOpenChange={(open: boolean) => !open && setDeletingCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingCustomer?.companyName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
