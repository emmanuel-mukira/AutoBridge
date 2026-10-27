import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Send } from "lucide-react";
import { ColumnFilter } from "@/components/shared/ColumnFilter";
import { TablePagination } from "@/components/shared/TablePagination";
import { userFilterConfigs } from "../config/filterConfig";
import type { SalesRep } from "@/types/user";
import type { FilterCondition } from "@/lib/filtering/types";

interface ApplicantsTableProps {
  applicants: SalesRep[];
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onInvite: (userId: string, email: string) => void;
  activeFilters: FilterCondition[];
  onFilterChange: (field: string, condition: FilterCondition | null) => void;
  onSort: (field: string) => void;
  getSortIcon: (field: string) => "asc" | "desc" | null;
}

/**
 * Applicants table component
 * Simplified table for pending applicants with invite action
 */
export const ApplicantsTable = memo(function ApplicantsTable({
  applicants,
  loading,
  error,
  page,
  pageSize,
  totalPages,
  totalCount,
  onPageChange,
  onPageSizeChange,
  onInvite,
  activeFilters,
  onFilterChange,
}: ApplicantsTableProps) {
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
              <th className="px-4 py-3 w-32 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Loading applicants...
                </td>
              </tr>
            ) : applicants.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No applicants found
                </td>
              </tr>
            ) : (
              applicants.map((user) => (
                <ApplicantRow
                  key={user.id}
                  user={user}
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

/**
 * Individual applicant row component
 */
const ApplicantRow = memo(function ApplicantRow({
  user,
  onInvite,
}: {
  user: SalesRep;
  onInvite: (userId: string, email: string) => void;
}) {
  const handleInvite = useCallback(() => {
    if (user.status === "active") return;
    onInvite(user.id, user.email);
  }, [onInvite, user.id, user.email, user.status]);

  return (
    <tr className="border-t">
      <td className="px-4 py-2">{user.firstName}</td>
      <td className="px-4 py-2">{user.lastName}</td>
      <td className="px-4 py-2 text-black/80 dark:text-white/80">{user.email}</td>
      <td className="px-4 py-2 text-black/80 dark:text-white/80">{user.phone ?? "-"}</td>
      <td className="px-2 py-1 text-right">
        <Button
          variant="ghost"
          size="sm"
          disabled={user.status === "active"}
          onClick={handleInvite}
        >
          <Send className="h-4 w-4 mr-2" />
          Send Invite
        </Button>
      </td>
    </tr>
  );
});
