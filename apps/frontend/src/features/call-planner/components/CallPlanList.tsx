import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Package, Edit, Eye, Trash2, CheckCircle, Clock, Building2 } from "lucide-react";
import type { CallPlan } from "../types";
import { useDeleteCallPlan, useMarkCallPlanCompleted } from "../hooks/useCallPlanner";
import { format } from "date-fns";

interface CallPlanListProps {
  callPlans: CallPlan[];
  isLoading: boolean;
  onEdit: (id: number) => void;
  onViewDetails: (id: number) => void;
}

const CALL_PURPOSE_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  Prospective: { label: "Prospecting", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", emoji: "🎯" },
  Selling: { label: "Selling", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", emoji: "💰" },
  Coverage: { label: "Coverage", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", emoji: "🗺️" },
  Collection: { label: "Collection", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", emoji: "💵" },
  Complaint: { label: "Complaint", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", emoji: "⚠️" },
};

import type { LucideIcon } from "lucide-react";

const LOCATION_TYPE_CONFIG: Record<string, { label: string; icon: LucideIcon }> = {
  Customer_Office: { label: "Customer Office", icon: Building2 },
  Customer_Site: { label: "Customer Site", icon: MapPin },
  Hotel: { label: "Hotel", icon: Building2 },
  Dealer_Branch: { label: "Dealer Branch", icon: Building2 },
};

export function CallPlanList({ callPlans, isLoading, onEdit, onViewDetails }: CallPlanListProps) {
  const deleteMutation = useDeleteCallPlan();
  const markCompletedMutation = useMarkCallPlanCompleted();

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this call plan?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleMarkCompleted = (id: number) => {
    markCompletedMutation.mutate({ id, data: {} });
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading call plans...</div>;
  }

  if (callPlans.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No call plans found. Create your first call plan to get started.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {callPlans.map((plan) => {
        const purposeConfig = CALL_PURPOSE_CONFIG[plan.purpose];
        const locationConfig = LOCATION_TYPE_CONFIG[plan.locationType];
        const LocationIcon = locationConfig.icon;

        return (
          <Card key={plan.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm">{plan.customer.companyName}</h3>
                  </div>
                  <Badge className={`${purposeConfig.color} text-xs font-medium`}>
                    {purposeConfig.emoji} {purposeConfig.label}
                  </Badge>
                </div>
                {plan.isCompleted ? (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Done
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{format(new Date(plan.plannedDate), "MMM dd, yyyy")}</span>
                  <span className="text-xs">{plan.dayOfWeek}</span>
                </div>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <LocationIcon className="h-4 w-4" />
                  <span>{locationConfig.label}</span>
                </div>

                {plan.productLine && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span>{plan.productLine}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewDetails(plan.id)}
                  className="flex-1 h-8 text-xs"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(plan.id)}
                  className="flex-1 h-8 text-xs"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                {!plan.isCompleted && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkCompleted(plan.id)}
                    className="flex-1 h-8 text-xs text-green-600 hover:text-green-700"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Done
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(plan.id)}
                  className="h-8 text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
