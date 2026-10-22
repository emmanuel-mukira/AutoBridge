import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/shared/TablePagination";

interface Quotation {
  id: number;
  quoteNumber: string;
  version: number;
  customerId: number;
  salesRepId: number;
  totalPrice: string;
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

interface CustomerQuotationsSectionProps {
  quotations: Quotation[];
  loading?: boolean;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "DRAFT": return "bg-gray-500";
    case "SENT": return "bg-blue-500";
    case "ACCEPTED": return "bg-green-500";
    case "REJECTED": return "bg-red-500";
    case "SUPERSEDED": return "bg-yellow-500";
    default: return "bg-gray-500";
  }
};

export const CustomerQuotationsSection = memo(function CustomerQuotationsSection({
  quotations,
  loading,
}: CustomerQuotationsSectionProps) {
  const sortedQuotations = useMemo(
    () => [...quotations].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    [quotations]
  );

  const {
    paged,
    page,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
  } = usePagination(sortedQuotations, { initialPageSize: 10 });

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
          <FileText className="h-5 w-5 text-primary" />
          Quotations
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {sortedQuotations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No quotations created yet
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote Number</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Total Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Sales Rep</TableHead>
                    <TableHead className="hidden lg:table-cell">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((quotation) => (
                    <TableRow key={quotation.id}>
                      <TableCell className="font-medium">
                        {quotation.quoteNumber}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">v{quotation.version}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        KES {Number(quotation.totalPrice).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(quotation.status)}>
                          {quotation.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {quotation.salesRep.firstName} {quotation.salesRep.lastName}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {new Date(quotation.createdAt).toLocaleDateString()}
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
              totalCount={sortedQuotations.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
});
