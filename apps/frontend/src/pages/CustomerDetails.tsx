import { useParams } from "react-router-dom";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { CustomerOverviewCard } from "@/features/customers/components/CustomerOverviewCard";
import { CustomerInteractionsSection } from "@/features/customers/components/CustomerInteractionsSection";
import { CustomerQuotationsSection } from "@/features/customers/components/CustomerQuotationsSection";
import { CustomerLeadsSection } from "@/features/customers/components/CustomerLeadsSection";
import { SalesRepHistoryCard } from "@/features/customers/components/SalesRepHistoryCard";
import { InteractionsByRepCard } from "@/features/customers/components/InteractionsByRepCard";
import { useCustomerDetails } from "@/features/customers/hooks/useCustomerDetails";
import { useCustomerInteractions } from "@/features/customers/hooks/useCustomerInteractions";
import { useCustomerQuotations } from "@/features/customers/hooks/useCustomerQuotations";
import { useCustomerLeads } from "@/features/customers/hooks/useCustomerLeads";
import { useSalesRepHistory } from "@/features/customers/hooks/useSalesRepHistory";
import { useInteractionsByRep } from "@/features/customers/hooks/useInteractionsByRep";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

export default function CustomerDetails() {
  const { id } = useParams<{ id: string }>();
  const customerId = Number(id);

  const { data: customer, isLoading: customerLoading, error: customerError } = useCustomerDetails(customerId);
  const { data: interactions = [], isLoading: interactionsLoading } = useCustomerInteractions(customerId);
  const { data: quotationsData, isLoading: quotationsLoading } = useCustomerQuotations(customerId);
  const { data: leadsData, isLoading: leadsLoading } = useCustomerLeads(customerId);
  const { data: salesRepHistory = [], isLoading: historyLoading } = useSalesRepHistory(customerId);
  const { data: interactionsByRep = [], isLoading: byRepLoading } = useInteractionsByRep(customerId);

  if (customerError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">Customer not found</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            The customer you're looking for doesn't exist or you don't have access to it.
          </p>
        </div>
      </div>
    );
  }

  const quotations = quotationsData?.quotations || [];
  const leads = leadsData?.leads || [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <Breadcrumb
        items={[
          { label: "Customers", href: "/dashboard/customers" },
          { label: customer?.companyName || "Loading..." },
        ]}
      />

      {customerLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      ) : customer ? (
        <>
          <CustomerOverviewCard customer={customer} loading={customerLoading} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <SalesRepHistoryCard history={salesRepHistory} loading={historyLoading} />
            <InteractionsByRepCard data={interactionsByRep} loading={byRepLoading} />
          </div>

          <div className="space-y-4 sm:space-y-6">
            <CustomerInteractionsSection
              interactions={interactions}
              loading={interactionsLoading}
            />

            <CustomerQuotationsSection
              quotations={quotations}
              loading={quotationsLoading}
            />

            <CustomerLeadsSection
              leads={leads}
              loading={leadsLoading}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
