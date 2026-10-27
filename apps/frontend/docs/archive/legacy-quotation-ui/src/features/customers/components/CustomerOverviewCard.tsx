import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, MapPin, User, Calendar } from "lucide-react";
import type { CustomerDetails } from "../types";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryLabel, getCategoryIcon } from "../utils/categoryUtils";

interface CustomerOverviewCardProps {
  customer: CustomerDetails;
  loading?: boolean;
}

export const CustomerOverviewCard = memo(function CustomerOverviewCard({
  customer,
  loading,
}: CustomerOverviewCardProps) {
  if (loading) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  const primaryContact = customer.contacts?.find((c) => c.isPrimary);

  return (
    <Card className="shadow-md">
      <CardHeader className="border-b bg-muted/5">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Company Information
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div>
          <h3 className="text-2xl font-bold text-foreground">{customer.companyName}</h3>
          {customer.shortHistory && (
            <p className="text-sm text-muted-foreground mt-2">{customer.shortHistory}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {customer.category && (() => {
            const CategoryIcon = getCategoryIcon(customer.category);
            return (
              <div className="flex items-start gap-3">
                <CategoryIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Category
                  </p>
                  <p className="text-sm font-medium">{getCategoryLabel(customer.category)}</p>
                </div>
              </div>
            );
          })()}

          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Location
              </p>
              <p className="text-sm font-medium">{customer.locationAddress}</p>
              <p className="text-sm text-muted-foreground">{customer.countyName}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Sales Representative
              </p>
              <p className="text-sm font-medium">
                {customer.salesRep
                  ? `${customer.salesRep.firstName} ${customer.salesRep.lastName}`
                  : "Unassigned"}
              </p>
              {customer.salesRep?.email && (
                <p className="text-sm text-muted-foreground">{customer.salesRep.email}</p>
              )}
            </div>
          </div>

          {primaryContact && (
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Primary Contact
                </p>
                <p className="text-sm font-medium">
                  {primaryContact.firstName} {primaryContact.lastName}
                </p>
                {primaryContact.email && (
                  <p className="text-sm text-muted-foreground">{primaryContact.email}</p>
                )}
                {primaryContact.phone && (
                  <p className="text-sm text-muted-foreground">{primaryContact.phone}</p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Created
              </p>
              <p className="text-sm font-medium">
                {new Date(customer.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{customer._count.leads}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Leads</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{customer._count.quotations}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Quotations</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{customer._count.interactions}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Interactions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{customer._count.callPlans}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Call Plans</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
