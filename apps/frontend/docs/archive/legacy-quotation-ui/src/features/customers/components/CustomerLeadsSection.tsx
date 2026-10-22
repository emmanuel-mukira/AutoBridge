import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/shared/TablePagination";

interface Lead {
  id: number;
  customerId: number;
  salesRepId: number;
  generatorRecommended: string;
  status: string;
  createdAt: string;
  customer: {
    companyName: string;
  };
  salesRep: {
    firstName: string;
    lastName: string;
  };
}

interface CustomerLeadsSectionProps {
  leads: Lead[];
  loading?: boolean;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "WON": return "bg-green-500";
    case "OPEN": return "bg-blue-500";
    case "LOST": return "bg-red-500";
    case "DRAFT": return "bg-gray-500";
    default: return "bg-gray-500";
  }
};

export const CustomerLeadsSection = memo(function CustomerLeadsSection({
  leads,
  loading,
}: CustomerLeadsSectionProps) {
  const sortedLeads = useMemo(
    () => [...leads].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    [leads]
  );

  const {
    paged,
    page,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
  } = usePagination(sortedLeads, { initialPageSize: 10 });

  if (loading) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md overflow-hidden">
      <CardHeader className="border-b bg-muted/5">
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Leads
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {sortedLeads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No leads created yet
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Generator Recommended</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Sales Rep</TableHead>
                    <TableHead className="hidden lg:table-cell">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">
                        {lead.generatorRecommended}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(lead.status)}>
                          {lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {lead.salesRep.firstName} {lead.salesRep.lastName}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <TablePagination
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              totalCount={sortedLeads.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
});
