import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Package, Edit, Eye, CheckCircle, Clock } from "lucide-react";
import type { CallPlan } from "../types";
import { useMarkCallPlanCompleted } from "../hooks/useCallPlanner";
import { format, addDays, parseISO } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WeeklyCallPlanViewProps {
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

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export function WeeklyCallPlanView({ callPlans, isLoading, onEdit, onViewDetails }: WeeklyCallPlanViewProps) {
  const markCompletedMutation = useMarkCallPlanCompleted();

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

  // Group call plans by week beginning
  const weekGroups = callPlans.reduce((acc, plan) => {
    const weekStart = format(parseISO(plan.weekBeginning), "yyyy-MM-dd");
    if (!acc[weekStart]) {
      acc[weekStart] = [];
    }
    acc[weekStart].push(plan);
    return acc;
  }, {} as Record<string, CallPlan[]>);

  // Sort weeks in reverse chronological order (most recent first)
  const sortedWeeks = Object.keys(weekGroups).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-8">
      {sortedWeeks.map((weekStart) => {
        const plans = weekGroups[weekStart];
        const weekDate = parseISO(weekStart);
        
        // Group plans by day of week
        const dayGroups = WEEKDAYS.reduce((acc, day) => {
          acc[day] = plans.filter(p => p.dayOfWeek === day);
          return acc;
        }, {} as Record<string, CallPlan[]>);

        return (
          <div key={weekStart} className="space-y-4">
            {/* Week Header */}
            <div className="flex items-center gap-3 pb-2 border-b-2 border-primary/20">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-lg font-bold">
                  Week Beginning: {format(weekDate, "MMMM dd, yyyy")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {format(weekDate, "MMM dd")} - {format(addDays(weekDate, 4), "MMM dd, yyyy")}
                </p>
              </div>
              <Badge variant="outline" className="ml-auto">
                {plans.length} {plans.length === 1 ? "plan" : "plans"}
              </Badge>
            </div>

            {/* 5-Day Grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {WEEKDAYS.map((day, index) => {
                const dayPlans = dayGroups[day];
                const dayDate = addDays(weekDate, index);
                
                return (
                  <div key={day} className="space-y-3">
                    {/* Day Header */}
                    <div className="sticky top-0 bg-background z-10 pb-2">
                      <div className="text-center p-1.5 bg-muted rounded-md">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase">
                          {day}
                        </p>
                        <p className="text-xs font-bold">
                          {format(dayDate, "MMM dd")}
                        </p>
                      </div>
                    </div>

                    {/* Day Cards */}
                    <div className="space-y-3">
                      {dayPlans.length === 0 ? (
                        <div className="text-center py-4 text-xs text-muted-foreground">
                          No plans
                        </div>
                      ) : (
                        dayPlans.map((plan) => {
                          const purposeConfig = CALL_PURPOSE_CONFIG[plan.purpose];
                          
                          return (
                            <Card 
                              key={plan.id} 
                              className={`hover:shadow-md transition-shadow ${
                                plan.isCompleted ? 'opacity-60' : ''
                              }`}
                            >
                              <CardContent className="p-4 space-y-3">
                                {/* Customer & Status */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm truncate">
                                      {plan.customer.companyName}
                                    </p>
                                  </div>
                                  {plan.isCompleted ? (
                                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                                  ) : (
                                    <Clock className="h-4 w-4 text-orange-600 shrink-0" />
                                  )}
                                </div>

                                {/* Purpose Badge */}
                                <Badge className={`${purposeConfig.color} text-xs font-medium w-full justify-center py-1`}>
                                  {purposeConfig.emoji} {purposeConfig.label}
                                </Badge>

                                {/* Location */}
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <MapPin className="h-4 w-4 shrink-0" />
                                  <span className="truncate">{plan.exactLocation}</span>
                                </div>

                                {/* Product Line */}
                                {plan.productLine && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Package className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{plan.productLine}</span>
                                  </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-1.5 pt-2 border-t">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onViewDetails(plan.id);
                                          }}
                                          className="flex-1 h-8 text-xs px-2"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>View details</TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(plan.id);
                                          }}
                                          className="flex-1 h-8 text-xs px-2"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Edit call plan</TooltipContent>
                                    </Tooltip>

                                    {!plan.isCompleted && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleMarkCompleted(plan.id);
                                            }}
                                            className="flex-1 h-8 text-xs px-2 text-green-600"
                                          >
                                            <CheckCircle className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Mark as completed</TooltipContent>
                                      </Tooltip>
                                    )}
                                  </TooltipProvider>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
