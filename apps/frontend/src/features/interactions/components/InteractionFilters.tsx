import { useState, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { useFilterStore } from "@/stores/useFilterStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import * as React from "react";
import { FilterDialog } from "@/components/shared/FilterDialog";
import type { InteractionType } from "../types";
import { http } from "@/lib/http";
import { useAuth } from "@/app/auth/useAuth";

interface InteractionFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterKey: string;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

interface Customer {
  id: number;
  companyName: string;
}

const INTERACTION_TYPES: InteractionType[] = ["CALL", "EMAIL", "MEETING", "SITE_VISIT", "FOLLOW_UP"];

export function InteractionFilters({ open, onOpenChange, filterKey }: InteractionFiltersProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  const { filters, addFilter, removeFilter } = useFilterStore();
  const activeFilters = useMemo(() => filters[filterKey] || [], [filters, filterKey]);

  const [localType, setLocalType] = useState<string>("");
  const [localSalesRepId, setLocalSalesRepId] = useState<string>("");
  const [localCustomerId, setLocalCustomerId] = useState<string>("");
  const [localStartDate, setLocalStartDate] = useState<string>("");
  const [localEndDate, setLocalEndDate] = useState<string>("");
  const [startDateObj, setStartDateObj] = React.useState<Date | undefined>();
  const [endDateObj, setEndDateObj] = React.useState<Date | undefined>();

  useEffect(() => {
    if (open) {
      const typeFilter = activeFilters.find(f => f.field === "type");
      const salesRepFilter = activeFilters.find(f => f.field === "salesRepId");
      const customerFilter = activeFilters.find(f => f.field === "customerId");
      const startDateFilter = activeFilters.find(f => f.field === "startDate");
      const endDateFilter = activeFilters.find(f => f.field === "endDate");

      setLocalType(typeFilter?.value ? String(typeFilter.value) : "");
      setLocalSalesRepId(salesRepFilter?.value ? String(salesRepFilter.value) : "");
      setLocalCustomerId(customerFilter?.value ? String(customerFilter.value) : "");
      setLocalStartDate(startDateFilter?.value ? String(startDateFilter.value) : "");
      setLocalEndDate(endDateFilter?.value ? String(endDateFilter.value) : "");
    }
  }, [open, activeFilters]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isAdmin) {
          const usersRes = await http.get<{ users: User[] }>("/api/users");
          setUsers(usersRes.data.users || []);
        }
        const customersRes = await http.get<{ customers: Customer[] }>("/api/customers");
        setCustomers(customersRes.data.customers || []);
      } catch {
        setUsers([]);
        setCustomers([]);
      }
    };
    fetchData();
  }, [isAdmin]);

  const handleApply = () => {
    if (localType) {
      addFilter(filterKey, { field: "type", operator: "equals", value: localType, type: "select" });
    } else {
      removeFilter(filterKey, "type");
    }

    if (localSalesRepId) {
      addFilter(filterKey, { field: "salesRepId", operator: "equals", value: Number(localSalesRepId), type: "number" });
    } else {
      removeFilter(filterKey, "salesRepId");
    }

    if (localCustomerId) {
      addFilter(filterKey, { field: "customerId", operator: "equals", value: Number(localCustomerId), type: "number" });
    } else {
      removeFilter(filterKey, "customerId");
    }

    if (localStartDate) {
      addFilter(filterKey, { field: "startDate", operator: "greaterThanOrEqual", value: localStartDate, type: "date" });
    } else {
      removeFilter(filterKey, "startDate");
    }

    if (localEndDate) {
      addFilter(filterKey, { field: "endDate", operator: "lessThanOrEqual", value: localEndDate, type: "date" });
    } else {
      removeFilter(filterKey, "endDate");
    }

    onOpenChange(false);
  };

  const handleClear = () => {
    setLocalType("");
    setLocalSalesRepId("");
    setLocalCustomerId("");
    setLocalStartDate("");
    setLocalEndDate("");
    removeFilter(filterKey, "type");
    removeFilter(filterKey, "salesRepId");
    removeFilter(filterKey, "customerId");
    removeFilter(filterKey, "startDate");
    removeFilter(filterKey, "endDate");
  };

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <FilterDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Filter Interactions"
      onApply={handleApply}
      onClear={handleClear}
      hasActiveFilters={hasActiveFilters}
      variant="dialog"
    >
      <div className="grid grid-cols-1 gap-4">
            {isAdmin && (
              <div className="space-y-2">
                <Label htmlFor="salesRep">Sales Rep</Label>
                <Select
                  value={localSalesRepId || "all"}
                  onValueChange={(value) => setLocalSalesRepId(value === "all" ? "" : value)}
                >
                  <SelectTrigger id="salesRep">
                    <SelectValue placeholder="All sales reps" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sales reps</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Select
                value={localCustomerId || "all"}
                onValueChange={(value) => setLocalCustomerId(value === "all" ? "" : value)}
              >
                <SelectTrigger id="customer">
                  <SelectValue placeholder="All customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All customers</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Interaction Type</Label>
              <Select
                value={localType || "all"}
                onValueChange={(value) => setLocalType(value === "all" ? "" : value)}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {INTERACTION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <DatePicker
                  date={startDateObj}
                  onDateChange={(date) => {
                    setStartDateObj(date);
                    setLocalStartDate(date ? date.toISOString().split('T')[0] : "");
                  }}
                  placeholder="Select start date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <DatePicker
                  date={endDateObj}
                  onDateChange={(date) => {
                    setEndDateObj(date);
                    setLocalEndDate(date ? date.toISOString().split('T')[0] : "");
                  }}
                  placeholder="Select end date"
                />
              </div>
            </div>
      </div>
    </FilterDialog>
  );
}
