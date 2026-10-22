import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUIStore } from "@/app/store";
import { OpportunityDialog } from "@/features/opportunities/components/OpportunityDialog";
import { OpportunityKanbanBoard } from "@/features/opportunities/components/OpportunityKanbanBoard";
import { OpportunityListView } from "@/features/opportunities/components/OpportunityListView";
import { OpportunityStageDialog } from "@/features/opportunities/components/OpportunityStageDialog";
import { useOpportunities, useTransitionOpportunity } from "@/features/opportunities/hooks/useOpportunities";
import type { Opportunity, OpportunityOutcome, OpportunityStage, SalesRoute } from "@/features/opportunities/services/opportunitiesApi";
import { BriefcaseBusiness, LayoutGrid, List, Plus, Search } from "lucide-react";

const all = "all";

export default function Opportunities() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity>();
  const [stageChange, setStageChange] = useState<{ opportunity: Opportunity; initialStage?: OpportunityStage } | null>(null);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<"" | OpportunityStage>("");
  const [route, setRoute] = useState<"" | SalesRoute>("");
  const displayCurrency = useUIStore((state) => state.displayCurrency);
  const { data, isLoading, error } = useOpportunities({ search: search || undefined, stage: stage || undefined, routeToMarket: route || undefined });
  const transition = useTransitionOpportunity();
  const opportunities = data?.opportunities ?? [];

  const editOpportunity = (opportunity: Opportunity) => {
    setEditingOpportunity(opportunity);
    setDialogOpen(true);
  };

  const requestStageChange = (opportunity: Opportunity, initialStage?: OpportunityStage) => {
    transition.reset();
    setStageChange({ opportunity, initialStage });
  };

  const handleStageDrop = (opportunity: Opportunity, nextStage: OpportunityStage) => {
    if (nextStage === "CLOSED") requestStageChange(opportunity, nextStage);
    else transition.mutate({ id: opportunity.id, stage: nextStage });
  };

  const changeStage = async (nextStage: OpportunityStage, outcome?: OpportunityOutcome) => {
    if (!stageChange) return;
    await transition.mutateAsync({ id: stageChange.opportunity.id, stage: nextStage, outcome });
    setStageChange(null);
  };

  return <section className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold">Opportunities</h1><p className="mt-1 text-sm text-muted-foreground">Track B2B automotive sales through each pipeline stage.</p></div><Button className="w-full sm:w-auto" onClick={() => { setEditingOpportunity(undefined); setDialogOpen(true); }}><Plus className="mr-2 h-4 w-4" />New opportunity</Button></div>
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" aria-label="Search opportunities" placeholder="Search opportunity title" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      <Select value={stage || all} onValueChange={(value) => setStage(value === all ? "" : value as OpportunityStage)}><SelectTrigger className="w-full sm:w-40" aria-label="Filter by stage"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={all}>All stages</SelectItem><SelectItem value="NEW">New</SelectItem><SelectItem value="QUALIFYING">Qualifying</SelectItem><SelectItem value="PROPOSAL">Proposal</SelectItem><SelectItem value="NEGOTIATION">Negotiation</SelectItem><SelectItem value="CLOSED">Closed</SelectItem></SelectContent></Select>
      <Select value={route || all} onValueChange={(value) => setRoute(value === all ? "" : value as SalesRoute)}><SelectTrigger className="w-full sm:w-44" aria-label="Filter by sales route"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={all}>All routes</SelectItem><SelectItem value="FIELDS_SALES">Field sales</SelectItem><SelectItem value="RESELLER">Reseller</SelectItem><SelectItem value="TELECOVERAGE">Telecoverage</SelectItem><SelectItem value="TELESALES">Telesales</SelectItem><SelectItem value="OTHER">Other</SelectItem></SelectContent></Select>
    </div>
    {isLoading && <p className="text-muted-foreground">Loading opportunities...</p>}
    {error && <p role="alert" className="text-destructive">Unable to load opportunities. Please try again.</p>}
    {!isLoading && !error && opportunities.length === 0 && <div className="rounded-lg border border-dashed bg-card py-12 text-center"><BriefcaseBusiness className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">No opportunities match these filters</p></div>}
    {!!opportunities.length && <Tabs defaultValue="board">
      <div className="flex flex-wrap items-center justify-between gap-2"><TabsList><TabsTrigger value="board"><LayoutGrid className="mr-2 h-4 w-4" />Board</TabsTrigger><TabsTrigger value="list"><List className="mr-2 h-4 w-4" />List</TabsTrigger></TabsList><p className="text-xs text-muted-foreground">Drag cards forward to update their stage.</p></div>
      <TabsContent value="board"><OpportunityKanbanBoard opportunities={opportunities} displayCurrency={displayCurrency} onEdit={editOpportunity} onStageDrop={handleStageDrop} movingId={transition.isPending ? transition.variables?.id : undefined} /></TabsContent>
      <TabsContent value="list"><OpportunityListView opportunities={opportunities} displayCurrency={displayCurrency} onEdit={editOpportunity} onChangeStage={(opportunity) => requestStageChange(opportunity)} /></TabsContent>
    </Tabs>}
    <OpportunityDialog open={dialogOpen} onOpenChange={setDialogOpen} opportunity={editingOpportunity} />
    <OpportunityStageDialog opportunity={stageChange?.opportunity ?? null} initialStage={stageChange?.initialStage} open={!!stageChange} onOpenChange={(open) => !open && setStageChange(null)} onSubmit={changeStage} pending={transition.isPending} error={transition.error} />
  </section>;
}
