import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Send } from "lucide-react";
import type { SalesRep } from "@/types/user";

interface UserTableRowProps {
  user: SalesRep;
  onMakeAdmin: (userId: string) => void;
  onChangeStatus: (userId: string, status: "PENDING" | "ACTIVE" | "SUSPENDED") => void;
  onInvite: (userId: string, email: string) => void;
}

/**
 * Individual user table row component with actions dropdown
 * Wrapped in React.memo for performance optimization
 */
export const UserTableRow = memo(function UserTableRow({
  user,
  onMakeAdmin,
  onChangeStatus,
  onInvite,
}: UserTableRowProps) {
  const handleMakeAdmin = useCallback(() => {
    onMakeAdmin(user.id);
  }, [onMakeAdmin, user.id]);

  const handleStatusChange = useCallback(
    (status: "PENDING" | "ACTIVE" | "SUSPENDED") => {
      onChangeStatus(user.id, status);
    },
    [onChangeStatus, user.id]
  );

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
      <td className="px-4 py-2">
        <span
          className={[
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs",
            user.role === "admin"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
          ].join(" ")}
        >
          {user.role === "admin" ? "Admin" : "Sales Rep"}
        </span>
      </td>
      <td className="px-4 py-2">
        <span
          className={[
            "inline-flex items-center rounded-full px-2 py-0.5 text-xs",
            user.status === "active" && "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",
            user.status === "inactive" && "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
            user.status === "suspended" && "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {user.status[0].toUpperCase() + user.status.slice(1)}
        </span>
      </td>
      <td className="px-2 py-1 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Row actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem 
              className="dropdown-item-custom" 
              onClick={handleMakeAdmin}
            >
              Make Admin
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Change Status</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem 
                  className="dropdown-item-custom" 
                  onClick={() => handleStatusChange("ACTIVE")}
                >
                  Active
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="dropdown-item-custom" 
                  onClick={() => handleStatusChange("PENDING")}
                >
                  Pending
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="dropdown-item-custom" 
                  onClick={() => handleStatusChange("SUSPENDED")}
                >
                  Suspended
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="dropdown-item-custom"
              disabled={user.status === "active"}
              onClick={handleInvite}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Invite {user.status === "active" && "(Already Active)"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
});
