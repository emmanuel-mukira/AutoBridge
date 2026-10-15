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
import { http } from "@/lib/http";

interface AuditLogFiltersProps {
  filterKey: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

const ACTIONS = [
  "LOGIN",
  "LOGOUT",
  "CUSTOMER_CREATED",
  "CUSTOMER_UPDATED",
  "CUSTOMER_DELETED",
  "LEAD_CREATED",
  "LEAD_UPDATED",
  "LEAD_DELETED",
  "QUOTATION_CREATED",
  "QUOTATION_UPDATED",
  "QUOTATION_DELETED",
  "INTERACTION_CREATED",
  "INTERACTION_UPDATED",
  "INTERACTION_DELETED",
  "USER_CREATED",
  "ROLE_CHANGED",
  "STATUS_CHANGED",
  "INVITE_SENT",
  "INVITE_ACCEPTED",
];

export function AuditLogFilters({ filterKey, open, onOpenChange }: AuditLogFiltersProps) {
  const [users, setUsers] = useState<User[]>([]);
  
  const { filters, addFilter, removeFilter } = useFilterStore();
  const activeFilters = useMemo(() => filters[filterKey] || [], [filters, filterKey]);

  const [localUserId, setLocalUserId] = useState<string>("");
  const [localAction, setLocalAction] = useState<string>("");
  const [localStartDate, setLocalStartDate] = useState<string>("");
  const [localEndDate, setLocalEndDate] = useState<string>("");
  const [startDateObj, setStartDateObj] = React.useState<Date | undefined>();
  const [endDateObj, setEndDateObj] = React.useState<Date | undefined>();

  useEffect(() => {
    const userFilter = activeFilters.find(f => f.field === "userId");
    const actionFilter = activeFilters.find(f => f.field === "action");
    const startDateFilter = activeFilters.find(f => f.field === "startDate");
    const endDateFilter = activeFilters.find(f => f.field === "endDate");

    setLocalUserId(userFilter?.value ? String(userFilter.value) : "");
    setLocalAction(actionFilter?.value ? String(actionFilter.value) : "");
    setLocalStartDate(startDateFilter?.value ? String(startDateFilter.value).split('T')[0] : "");
    setLocalEndDate(endDateFilter?.value ? String(endDateFilter.value).split('T')[0] : "");
  }, [activeFilters]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await http.get<{ users: User[] }>("/api/users");
        setUsers(res.data.users || []);
      } catch (error) {
        console.error("Failed to fetch users:", error);
        setUsers([]);
      }
    };
    fetchUsers();
  }, []);

  const handleApply = () => {
    if (localUserId) {
      addFilter(filterKey, { field: "userId", operator: "equals", value: Number(localUserId), type: "number" });
    } else {
      removeFilter(filterKey, "userId");
    }

    if (localAction) {
      addFilter(filterKey, { field: "action", operator: "equals", value: localAction, type: "select" });
    } else {
      removeFilter(filterKey, "action");
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
  };

  const handleClear = () => {
    setLocalUserId("");
    setLocalAction("");
    setLocalStartDate("");
    setLocalEndDate("");
    removeFilter(filterKey, "userId");
    removeFilter(filterKey, "action");
    removeFilter(filterKey, "startDate");
    removeFilter(filterKey, "endDate");
  };

  const hasActiveFilters = activeFilters.length > 0;
  const variant = open !== undefined && onOpenChange !== undefined ? "dialog" : "card";

  return (
    <FilterDialog
      variant={variant}
      open={open}
      onOpenChange={onOpenChange}
      title={variant === "dialog" ? "Filter Audit Logs" : "Filters"}
      onApply={handleApply}
      onClear={handleClear}
      hasActiveFilters={hasActiveFilters}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="user">User</Label>
              <Select
                value={localUserId || "all"}
                onValueChange={(value) => setLocalUserId(value === "all" ? "" : value)}
              >
                <SelectTrigger id="user">
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">Action</Label>
              <Select
                value={localAction || "all"}
                onValueChange={(value) => setLocalAction(value === "all" ? "" : value)}
              >
                <SelectTrigger id="action">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {ACTIONS.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
    </FilterDialog>
  );
}
