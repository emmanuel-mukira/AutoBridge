import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2, Circle } from "lucide-react";
import { useCallPlans } from "@/features/call-planner/hooks/useCallPlanner";
import { CreateCallPlanWizard } from "@/features/call-planner/components/CreateCallPlanWizard";
import { EditCallPlanDialog } from "@/features/call-planner/components/EditCallPlanDialog";
import { CallPlanDetailDialog } from "@/features/call-planner/components/CallPlanDetailDialog";
import { WeeklyCallPlanView } from "@/features/call-planner/components/WeeklyCallPlanView";
import { SalesRepFilter } from "@/features/call-planner/components/SalesRepFilter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/app/auth/useAuth";

export default function CallPlanner() {
  const { user } = useAuth();
  const isAdmin = user?.groups.includes("admin") ?? false;
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCallPlanId, setSelectedCallPlanId] = useState<number | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"upcoming" | "completed">("upcoming");
  const [selectedSalesRepId, setSelectedSalesRepId] = useState<number | null>(null);

  const upcomingParams = { isCompleted: false, ...(selectedSalesRepId && { salesRepId: selectedSalesRepId }) };
  const completedParams = { isCompleted: true, ...(selectedSalesRepId && { salesRepId: selectedSalesRepId }) };

  const { data: upcomingData, isLoading: upcomingLoading } = useCallPlans(upcomingParams);
  const { data: completedData, isLoading: completedLoading } = useCallPlans(completedParams);

  const handleEdit = (id: number) => {
    setSelectedCallPlanId(id);
    setIsEditDialogOpen(true);
  };

  const handleViewDetails = (id: number) => {
    setSelectedCallPlanId(id);
    setIsDetailDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Call Planner</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Schedule and track customer calls
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Call Plan
        </Button>
      </div>

      {isAdmin && (
        <SalesRepFilter
          value={selectedSalesRepId}
          onChange={setSelectedSalesRepId}
        />
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upcoming" | "completed")}>
        <TabsList>
          <TabsTrigger value="upcoming">
            <Circle className="h-4 w-4 mr-2" />
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="completed">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Completed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          <WeeklyCallPlanView
            callPlans={upcomingData?.callPlans || []}
            isLoading={upcomingLoading}
            onEdit={handleEdit}
            onViewDetails={handleViewDetails}
          />
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <WeeklyCallPlanView
            callPlans={completedData?.callPlans || []}
            isLoading={completedLoading}
            onEdit={handleEdit}
            onViewDetails={handleViewDetails}
          />
        </TabsContent>
      </Tabs>

      <CreateCallPlanWizard
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
      
      {selectedCallPlanId && (
        <>
          <EditCallPlanDialog
            callPlanId={selectedCallPlanId}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
          />
          <CallPlanDetailDialog
            callPlanId={selectedCallPlanId}
            open={isDetailDialogOpen}
            onOpenChange={setIsDetailDialogOpen}
          />
        </>
      )}
    </div>
  );
}
