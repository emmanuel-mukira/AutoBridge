import React from "react";
import { PieChart } from "@mui/x-charts/PieChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StatusData {
  status: string;
  count: number;
}

interface StatusDistributionChartProps {
  data: StatusData[];
  title?: string;
  description?: string;
}

const outcomeColors: Record<string, string> = {
  OPEN: "#2563eb",
  WON: "#16a34a",
  LOST: "#dc2626",
};

export const StatusDistributionChart = React.memo(function StatusDistributionChart({
  data,
  title = "Opportunity outcome",
  description = "Open pipeline records and resolved outcomes",
}: StatusDistributionChartProps) {
  const chartData = data.map((item) => ({
    id: item.status,
    value: item.count,
    label: item.status.charAt(0) + item.status.slice(1).toLowerCase(),
    color: outcomeColors[item.status] ?? "#64748b",
  }));

  if (data.length === 0) {
    return (
      <Card className="flex h-full flex-col overflow-hidden border-muted/40 bg-card/50 shadow-sm backdrop-blur-sm">
        <CardHeader className="border-b bg-muted/5 py-3">
          <CardTitle className="text-sm font-bold uppercase tracking-[0.15em]">{title}</CardTitle>
          <CardDescription className="mt-1 text-xs">{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-44 flex-1 items-center justify-center text-sm text-muted-foreground">
          No outcome data for this period.
        </CardContent>
      </Card>
    );
  }

  const totalCount = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="flex h-full flex-col overflow-hidden border-muted/40 bg-card/50 shadow-sm backdrop-blur-sm">
      <CardHeader className="border-b bg-muted/5 py-3">
        <CardTitle className="text-sm font-bold uppercase tracking-[0.15em]">{title}</CardTitle>
        <CardDescription className="mt-1 text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center p-4">
        <div className="relative mb-4 h-36 w-36">
          <PieChart
            series={[{
              data: chartData,
              innerRadius: 45,
              outerRadius: 68,
              paddingAngle: 3,
              cornerRadius: 4,
              cx: 72,
              cy: 72,
              valueFormatter: (item) => `${item.value.toLocaleString()} opportunities`,
            }]}
            width={144}
            height={144}
            hideLegend
          />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold tabular-nums">{totalCount.toLocaleString()}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Total</span>
          </div>
        </div>

        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3" aria-label="Opportunity outcome legend">
          {chartData.map((item) => (
            <div key={item.id} className="flex items-center gap-2 rounded-md border border-muted/40 px-3 py-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">{item.label}</span>
              <span className="text-sm font-semibold tabular-nums">{item.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
