import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/shared/TablePagination";

interface Interaction {
  id: number;
  customerId: number;
  salesRepId: number;
  contactId: number | null;
  type: string;
  notes: string;
  interactionDate: string;
  createdAt: string;
  salesRep: {
    id: number;
    firstName: string;
    lastName: string;
  };
  contact: {
    id: number;
    firstName: string;
    lastName: string;
  } | null;
}

interface CustomerInteractionsSectionProps {
  interactions: Interaction[];
  loading?: boolean;
}

export const CustomerInteractionsSection = memo(function CustomerInteractionsSection({
  interactions,
  loading,
}: CustomerInteractionsSectionProps) {
  const sortedInteractions = useMemo(
    () => [...interactions].sort((a, b) => 
      new Date(b.interactionDate).getTime() - new Date(a.interactionDate).getTime()
    ),
    [interactions]
  );

  const {
    paged,
    page,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
  } = usePagination(sortedInteractions, { initialPageSize: 10 });

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
          <MessageSquare className="h-5 w-5 text-primary" />
          Interaction History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {sortedInteractions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No interactions recorded yet
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Sales Rep</TableHead>
                    <TableHead className="hidden md:table-cell">Contact</TableHead>
                    <TableHead className="hidden lg:table-cell">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((interaction) => (
                    <TableRow key={interaction.id}>
                      <TableCell className="font-medium">
                        {new Date(interaction.interactionDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                          {interaction.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        {interaction.salesRep.firstName} {interaction.salesRep.lastName}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {interaction.contact
                          ? `${interaction.contact.firstName} ${interaction.contact.lastName}`
                          : "-"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-xs truncate">
                        {interaction.notes || "-"}
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
              totalCount={sortedInteractions.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
});
