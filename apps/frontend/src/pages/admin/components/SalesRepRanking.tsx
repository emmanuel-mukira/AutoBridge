import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import type { SalesRepPerformance } from "@/features/analytics/types";

interface SalesRepRankingProps {
  data: SalesRepPerformance[];
}

export function SalesRepRanking({ data }: SalesRepRankingProps) {
  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="font-bold text-muted-foreground w-5 text-center">{index + 1}</span>;
    }
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Sales Representative Ranking</CardTitle>
        <CardDescription>Top performers based on won leads and accepted quotations</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Rank</TableHead>
              <TableHead>Sales Rep</TableHead>
              <TableHead className="text-right">Won Leads</TableHead>
              <TableHead className="text-right">Accepted Quotes</TableHead>
              <TableHead className="text-right">Conversion Rate</TableHead>
              <TableHead className="text-right">Total Leads</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((rep, index) => (
              <TableRow key={rep.name}>
                <TableCell className="font-medium">
                  <div className="flex items-center justify-center">
                    {getRankIcon(index)}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{rep.name}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                    {rep.wonLeads}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                    ${rep.totalValue.toLocaleString()}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{rep.conversionRate}%</TableCell>
                <TableCell className="text-right text-muted-foreground">{rep.totalLeads}</TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No performance data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
