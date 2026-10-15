import { memo } from "react";
import { Card } from "@/components/ui/card";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { UserTableRow } from "./UserTableRow";
import { ColumnFilter } from "@/components/shared/ColumnFilter";
import { TablePagination } from "@/components/shared/TablePagination";
import { userFilterConfigs } from "../config/filterConfig";
import type { SalesRep } from "@/types/user";
import type { FilterCondition } from "@/lib/filtering/types";

interface UserTableProps {
  users: SalesRep[];
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onMakeAdmin: (userId: string) => void;
  onChangeStatus: (userId: string, status: "PENDING" | "ACTIVE" | "SUSPENDED") => void;
  onInvite: (userId: string, email: string) => void;
  activeFilters: FilterCondition[];
  onFilterChange: (field: string, condition: FilterCondition | null) => void;
  onSort: (field: string) => void;
  getSortIcon: (field: string) => "asc" | "desc" | null;
}

/**
 * User table component with pagination
 * Displays user data in a table format with action controls
 */
export const UserTable = memo(function UserTable({
  users,
  loading,
  error,
  page,
  pageSize,
  totalPages,
  totalCount,
  onPageChange,
  onPageSizeChange,
  onMakeAdmin,
  onChangeStatus,
  onInvite,
  activeFilters,
  onFilterChange,
  onSort,
  getSortIcon,
}: UserTableProps) {
  return (
    <Card>
      {error && (
        <div className="p-4 text-sm text-destructive bg-destructive/10 border-b border-destructive/20">
          {error}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">
                <div className="flex items-center gap-1">
                  <span>First Name</span>
                  <ColumnFilter
                    config={userFilterConfigs[0]}
                    value={activeFilters.find((f) => f.field === "firstName")}
                    onChange={(condition) => onFilterChange("firstName", condition)}
                  />
                </div>
              </th>
              <th className="px-4 py-3 text-left font-semibold">
                <div className="flex items-center gap-1">
                  <span>Last Name</span>
                  <ColumnFilter
                    config={userFilterConfigs[1]}
                    value={activeFilters.find((f) => f.field === "lastName")}
                    onChange={(condition) => onFilterChange("lastName", condition)}
                  />
                </div>
              </th>
              <th className="px-4 py-3 text-left font-semibold">
                <div className="flex items-center gap-1">
                  <span>Email</span>
                  <ColumnFilter
                    config={userFilterConfigs[2]}
                    value={activeFilters.find((f) => f.field === "email")}
                    onChange={(condition) => onFilterChange("email", condition)}
                  />
                </div>
              </th>
              <th className="px-4 py-3 text-left font-semibold">
                <div className="flex items-center gap-1">
                  Phone
                  <ColumnFilter
                    config={userFilterConfigs[3]}
                    value={activeFilters.find((f) => f.field === "phone")}
                    onChange={(condition) => onFilterChange("phone", condition)}
                  />
                </div>
              </th>
              <th className="px-4 py-3 text-left font-semibold">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onSort("role")}
                    className="flex items-center gap-1 hover:text-foreground transition-colors group"
                  >
                    <span>Role</span>
                    {getSortIcon("role") === null && (
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                    )}
                    {getSortIcon("role") === "asc" && (
                      <ArrowUp className="h-3.5 w-3.5 text-primary" />
                    )}
                    {getSortIcon("role") === "desc" && (
                      <ArrowDown className="h-3.5 w-3.5 text-primary" />
                    )}
                  </button>
                  <ColumnFilter
                    config={userFilterConfigs[4]}
                    value={activeFilters.find((f) => f.field === "role")}
                    onChange={(condition) => onFilterChange("role", condition)}
                  />
                </div>
              </th>
              <th className="px-4 py-3 text-left font-semibold">
                <div className="flex items-center gap-1">
                  <span>Status</span>
                  <ColumnFilter
                    config={userFilterConfigs[5]}
                    value={activeFilters.find((f) => f.field === "status")}
                    onChange={(condition) => onFilterChange("status", condition)}
                  />
                </div>
              </th>
              <th className="px-4 py-3 w-12 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <UserTableRow
                  key={user.id}
                  user={user}
                  onMakeAdmin={onMakeAdmin}
                  onChangeStatus={onChangeStatus}
                  onInvite={onInvite}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      <TablePagination
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </Card>
  );
});
