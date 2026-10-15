import { useState, useCallback, useMemo } from "react";
import { useUsers, useChangeUserRole, useChangeUserStatus } from "@/features/admin/hooks/useUsers";
import { useUserFilters } from "@/features/admin/hooks/useUserFilters";
import { usePagination } from "@/hooks/usePagination";
import { useSorting } from "@/hooks/useSorting";
import { useFilterStore } from "@/stores/useFilterStore";
import { useClientFiltering } from "@/hooks/useClientFiltering";
import type { FilterCondition } from "@/lib/filtering/types";
import { UserFilters } from "@/features/admin/components/UserFilters";
import { UserTable } from "@/features/admin/components/UserTable";
import { ApplicantsTable } from "@/features/admin/components/ApplicantsTable";
import { AddUserDialog } from "@/features/admin/components/AddUserDialog";
import { InviteUserDialog } from "@/features/admin/components/InviteUserDialog";
import type { SalesRep } from "@/types/user";

const FILTER_KEY = "admin-users";

/**
 * AdminUsers page component
 * Orchestrates user management functionality using extracted components and hooks
 * Target: <150 lines (orchestration only)
 */
export default function AdminUsers() {
  // Dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUserId, setInviteUserId] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");

  // TanStack Query hooks for server state
  const { data: usersData, isLoading, error: queryError, isFetching } = useUsers();
  const changeRoleMutation = useChangeUserRole();
  const changeStatusMutation = useChangeUserStatus();

  // Transform backend data to frontend format
  const users = useMemo<SalesRep[]>(() => {
    if (!usersData) return [];
    return usersData.map((u) => ({
      id: String(u.id),
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone || "",
      role: (u.role.name === "admin" ? "admin" : "sales_rep") as "admin" | "sales_rep",
      status: u.status === "ACTIVE" ? "active" : u.status === "SUSPENDED" ? "suspended" : "inactive",
    }));
  }, [usersData]);

  // Mutation handlers
  const handleMakeAdmin = useCallback(
    async (userId: string) => {
      changeRoleMutation.mutate({ userId: Number(userId), role: "admin" });
    },
    [changeRoleMutation]
  );

  const handleChangeStatus = useCallback(
    async (userId: string, status: "PENDING" | "ACTIVE" | "SUSPENDED") => {
      changeStatusMutation.mutate({ userId: Number(userId), status });
    },
    [changeStatusMutation]
  );

  const loading = isLoading;
  const error = queryError ? (queryError instanceof Error ? queryError.message : "Failed to load users") : null;
  const isRefreshing = isFetching && !isLoading;

  const { filters: storedFilters, addFilter, removeFilter } = useFilterStore();
  const activeFilters = storedFilters[FILTER_KEY] || [];

  const filteredByColumn = useClientFiltering(users, activeFilters);

  const {
    tab,
    setTab,
    search,
    setSearch,
    applicants,
    filteredList,
  } = useUserFilters(filteredByColumn);

  const { sortedData: sortedList, handleSort, getSortIcon } = useSorting<SalesRep>(filteredList);

  const {
    paged,
    page,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
  } = usePagination(sortedList, { initialPageSize: 5 });

  // Invite handlers
  const handleOpenInvite = useCallback((userId: string, email: string) => {
    setInviteUserId(userId);
    setInviteEmail(email);
    setInviteOpen(true);
  }, []);

  const handleAddUser = useCallback(() => {
    setAddOpen(true);
  }, []);

  const handleSendInviteClick = useCallback(() => {
    setInviteUserId(null);
    setInviteEmail("");
    setInviteOpen(true);
  }, []);

  const handleFilterChange = useCallback((field: string, condition: FilterCondition | null) => {
    if (condition) {
      addFilter(FILTER_KEY, condition);
    } else {
      removeFilter(FILTER_KEY, field);
    }
  }, [addFilter, removeFilter]);

  return (
    <div className="space-y-3">
      <UserFilters
        tab={tab}
        onTabChange={setTab}
        search={search}
        onSearchChange={setSearch}
        onPageReset={() => setPage(1)}
        onAddUser={handleAddUser}
        onSendInvite={handleSendInviteClick}
        isRefreshing={isRefreshing}
        applicantCount={applicants.length}
      />

      {tab === "reps" ? (
        <UserTable
          users={paged}
          loading={loading}
          error={error}
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          totalCount={sortedList.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onMakeAdmin={handleMakeAdmin}
          onChangeStatus={handleChangeStatus}
          onInvite={handleOpenInvite}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onSort={handleSort}
          getSortIcon={getSortIcon}
        />
      ) : (
        <ApplicantsTable
          applicants={paged}
          loading={loading}
          error={error}
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          totalCount={sortedList.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onInvite={handleOpenInvite}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onSort={handleSort}
          getSortIcon={getSortIcon}
        />
      )}

      <AddUserDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={() => {/* Query will auto-refetch */}}
      />

      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        userId={inviteUserId}
        email={inviteEmail}
        onSuccess={() => {/* Query will auto-refetch */}}
      />
    </div>
  );
}
     