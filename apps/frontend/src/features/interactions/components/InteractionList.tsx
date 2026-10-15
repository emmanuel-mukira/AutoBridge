import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Phone, Mail, Users, MapPin, MessageCircle, Edit, Eye, Trash2, MoreVertical } from "lucide-react";
import type { Interaction } from "../types";
import { useDeleteInteraction } from "../hooks/useInteractions";
import { format } from "date-fns";

interface InteractionListProps {
  interactions: Interaction[];
  isLoading: boolean;
  onEdit: (id: number) => void;
  onViewDetails: (id: number) => void;
}

import type { LucideIcon } from "lucide-react";

const INTERACTION_TYPE_CONFIG: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  CALL: { label: "Call", icon: Phone, color: "text-blue-600 dark:text-blue-400" },
  EMAIL: { label: "Email", icon: Mail, color: "text-purple-600 dark:text-purple-400" },
  MEETING: { label: "Meeting", icon: Users, color: "text-green-600 dark:text-green-400" },
  SITE_VISIT: { label: "Site Visit", icon: MapPin, color: "text-orange-600 dark:text-orange-400" },
  FOLLOW_UP: { label: "Follow Up", icon: MessageCircle, color: "text-yellow-600 dark:text-yellow-400" },
};

export function InteractionList({ interactions, isLoading, onEdit, onViewDetails }: InteractionListProps) {
  const deleteMutation = useDeleteInteraction();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
      setDeleteId(null);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading interactions...</div>;
  }

  if (interactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No interactions found. Create your first interaction to get started.
      </div>
    );
  }

  const groupedByDate = interactions.reduce((acc, interaction) => {
    const date = format(new Date(interaction.interactionDate), "dd MMM, yyyy");
    if (!acc[date]) acc[date] = [];
    acc[date].push(interaction);
    return acc;
  }, {} as Record<string, Interaction[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedByDate).map(([date, dateInteractions]) => (
        <div key={date}>
          <div className="ps-2 my-4 first:mt-0">
            <h3 className="text-lg font-bold uppercase text-gray-700 dark:text-neutral-300">
              {date}
            </h3>
          </div>

          {dateInteractions.map((interaction) => {
            const config = INTERACTION_TYPE_CONFIG[interaction.type];
            const Icon = config.icon;

            return (
              <div key={interaction.id} className="flex gap-x-6 mb-8 ml-4">
                <div className="relative last:after:hidden after:absolute after:top-7 after:bottom-0 after:start-3.5 after:w-px after:-translate-x-[0.5px] after:bg-gray-200 dark:after:bg-neutral-700">
                  <div className="relative z-10 size-7 flex justify-center items-center">
                    <div className={`size-7 rounded-full flex items-center justify-center bg-white dark:bg-neutral-900 border-2 border-gray-200 dark:border-neutral-700 ${config.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </div>

                <div className="grow pt-0.5 pb-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                          {interaction.customer.companyName}
                        </h3>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Icon className={`h-4 w-4 ${config.color}`} />
                          <span className={`font-medium ${config.color}`}>{config.label}</span>
                        </div>
                      </div>
                      
                      <div className="text-base text-gray-600 dark:text-neutral-400 space-y-2">
                        {interaction.contact && (
                          <p className="flex items-center gap-1.5">
                            <span className="font-medium">Contact:</span>
                            {interaction.contact.firstName} {interaction.contact.lastName}
                          </p>
                        )}
                        <p className="flex items-center gap-1.5">
                          <span className="font-medium">Rep:</span>
                          {interaction.salesRep.firstName} {interaction.salesRep.lastName}
                        </p>
                        <p className="mt-3 text-base">{interaction.notes}</p>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <div className="hidden sm:flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewDetails(interaction.id)}
                            className="h-8 text-xs"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                            View Details
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(interaction.id)}
                            className="h-8 text-xs"
                          >
                            <Edit className="h-3.5 w-3.5 mr-1.5" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(interaction.id)}
                            className="h-8 text-xs text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Delete
                          </Button>
                        </div>
                        
                        <div className="sm:hidden">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                                <MoreVertical className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => onViewDetails(interaction.id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onEdit(interaction.id)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setDeleteId(interaction.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Interaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this interaction? This action cannot be undone.
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
