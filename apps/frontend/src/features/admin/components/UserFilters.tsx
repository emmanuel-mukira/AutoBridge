import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Plus, Users, RefreshCw } from "lucide-react";

type TabType = "reps" | "applicants";

interface UserFiltersProps {
  tab: TabType;
  onTabChange: (tab: TabType) => void;
  search: string;
  onSearchChange: (search: string) => void;
  onPageReset: () => void;
  onAddUser: () => void;
  onSendInvite: () => void;
  isRefreshing: boolean;
  applicantCount: number;
}

/**
 * User filters and tab controls component
 * Handles search, tab switching, and action buttons
 */
export const UserFilters = memo(function UserFilters({
  tab,
  onTabChange,
  search,
  onSearchChange,
  onPageReset,
  onAddUser,
  onSendInvite,
  isRefreshing,
  applicantCount,
}: UserFiltersProps) {
  const handleSearchChange = (value: string) => {
    onSearchChange(value);
    onPageReset();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            {isRefreshing && (
              <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Manage sales representatives and review applicants
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onSendInvite}>
            <Send className="h-4 w-4 mr-2" />
            Send Invite
          </Button>
          <Button size="sm" onClick={onAddUser}>
            <Plus className="h-4 w-4 mr-2" />
            Add Sales Rep
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="inline-flex items-center rounded-lg border bg-muted/50 p-1">
          <Button
            variant={tab === "reps" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onTabChange("reps")}
            className="rounded-md"
          >
            <Users className="h-4 w-4 mr-2" />
            Sales Reps
          </Button>
          <Button
            variant={tab === "applicants" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onTabChange("applicants")}
            className="rounded-md"
          >
            Applicants
            {applicantCount > 0 && (
              <span className="ml-2 rounded-full bg-red-500 text-white px-2 py-0.5 text-xs font-semibold">
                {applicantCount}
              </span>
            )}
          </Button>
        </div>
        
        <Input
          placeholder={
            tab === "reps" ? "Search sales reps..." : "Search applicants..."
          }
          className="max-w-xs"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
});
