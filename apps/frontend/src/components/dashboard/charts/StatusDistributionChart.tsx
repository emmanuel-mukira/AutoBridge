import React from "react";
import { PieChart } from '@mui/x-charts/PieChart';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatusData {
  status: string;
  count: number;
}

interface StatusDistributionChartProps {
  data: StatusData[];
}

export const StatusDistributionChart = React.memo(function StatusDistributionChart({ data }: StatusDistributionChartProps) {
  const colorMap: Record<string, string> = {
    'DRAFT': '#6b7280',
    'OPEN': '#3b82f6',
    'WON': '#10b981',
    'LOST': '#ef4444',
  };

  const muiData = data.map((item) => ({
    id: item.status,
    value: item.count === 0 && data.length === 1 ? 1 : item.count,
    label: item.status,
    color: colorMap[item.status] || '#8b5cf6',
  }));

  const colors = muiData.map(item => item.color);

  if (data.length === 0) {
    return (
      <Card className="flex flex-col h-full border border-muted/20 shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] overflow-hidden bg-card/80 backdrop-blur-sm">
        <CardHeader className="items-center pb-3 border-b bg-muted/5">
          <CardTitle className="text-lg font-bold">Lead Distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-6 flex items-center justify-center min-h-[240px]">
          <p className="text-sm text-muted-foreground">No data available for this period</p>
        </CardContent>
      </Card>
    );
  }

  const totalCount = muiData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="flex flex-col h-full border border-muted/20 shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] overflow-hidden bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3 border-b bg-muted/5">
        <CardTitle className="text-lg font-bold text-center">Lead Distribution</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-6 flex flex-col items-center">
        <div className="relative w-40 h-40 mb-6">
          <PieChart
            series={[
              {
                data: muiData,
                innerRadius: 50,
                outerRadius: 75,
                paddingAngle: 3,
                cornerRadius: 4,
                cx: 80,
                cy: 80,
              },
            ]}
            colors={colors}
            width={160}
            height={160}
            slotProps={{
              legend: { 
                position: { vertical: 'bottom', horizontal: 'center' },
              },
            }}
            sx={{
              "& .MuiChartsLegend-root": {
                display: "none",
              },
            }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-black">{totalCount}</span>
            <span className="text-[9px] font-bold text-muted-foreground uppercase">Total</span>
          </div>
        </div>

        {/* Custom Legend - 2x2 grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 w-full">
          {muiData.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none">{item.label}</p>
                <p className="text-lg font-bold leading-none mt-1">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
