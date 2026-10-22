import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MoreVertical, Trash2, Calendar } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLeadsStore } from "../store/leadsStore";
import { useDeleteLead } from "../hooks/useLeads";
import { useAuth } from "@/app/auth/useAuth";
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
import type { Lead } from "../types";

function getLeadAge(createdAt: string): number {
  return Math.floor(
    (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
}

interface LeadKanbanCardProps {
  lead: Lead;
}

const LeadKanbanCardComponent = ({ lead }: LeadKanbanCardProps) => {
  const { user } = useAuth();
  const openDetailDialog = useLeadsStore((state) => state.openDetailDialog);
  const openEditDialog = useLeadsStore((state) => state.openEditDialog);
  const deleteLeadMutation = useDeleteLead();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isAdmin = user?.groups.includes("admin") ?? false;
  const salesRepInitials = `${lead.salesRep.firstName[0]}${lead.salesRep.lastName[0]}`.toUpperCase();
  const leadAge = getLeadAge(lead.createdAt);

  const handleDelete = async () => {
    await deleteLeadMutation.mutateAsync(lead.id);
    setShowDeleteDialog(false);
  };

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className="text-[9px] sm:text-[10px] font-mono px-1 sm:px-1.5 py-0.5">
          #{lead.id}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              data-no-dnd="true"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" data-no-dnd="true">
            <DropdownMenuItem
              data-no-dnd="true"
              onSelect={() => openDetailDialog(lead)}
              onClick={(e) => e.stopPropagation()}
            >
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem
              data-no-dnd="true"
              onSelect={() => openEditDialog(lead)}
              onClick={(e) => e.stopPropagation()}
            >
              Edit
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem
                data-no-dnd="true"
                className="text-destructive"
                onSelect={() => setShowDeleteDialog(true)}
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        <h4 className="font-semibold text-xs sm:text-sm leading-tight">
          {lead.customer.companyName}
        </h4>

        {lead.generatorRecommended && (
          <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {lead.generatorRecommended}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-1.5 sm:gap-2 pt-1.5 sm:pt-2 border-t border-border/50">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <Avatar className="h-5 w-5 sm:h-6 sm:w-6 shrink-0">
            <AvatarFallback className="text-[8px] sm:text-[9px] font-medium bg-primary/10 text-primary">
              {salesRepInitials}
            </AvatarFallback>
          </Avatar>
          <span className="text-[9px] sm:text-[10px] text-muted-foreground truncate">
            {lead.salesRep.firstName} {lead.salesRep.lastName}
          </span>
        </div>
        <div className="flex items-center gap-0.5 text-[9px] sm:text-[10px] text-muted-foreground shrink-0">
          <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
          <span>{leadAge}d</span>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lead for {lead.customer.companyName}? This action cannot be undone.
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
};

// Custom comparison function to prevent unnecessary re-renders
const arePropsEqual = (prev: LeadKanbanCardProps, next: LeadKanbanCardProps) => {
  return (
    prev.lead.id === next.lead.id &&
    prev.lead.status === next.lead.status &&
    prev.lead.generatorRecommended === next.lead.generatorRecommended &&
    prev.lead.customer.companyName === next.lead.customer.companyName &&
    prev.lead.salesRep.firstName === next.lead.salesRep.firstName &&
    prev.lead.salesRep.lastName === next.lead.salesRep.lastName
  );
};

export const LeadKanbanCard = memo(LeadKanbanCardComponent, arePropsEqual);
