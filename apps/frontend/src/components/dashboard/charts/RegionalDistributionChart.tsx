import React from "react";
import { PieChart } from '@mui/x-charts/PieChart';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type RegionalDistribution } from "@/features/analytics/types";

interface RegionalDistributionChartProps {
  data: RegionalDistribution[];
}

export const RegionalDistributionChart = React.memo(function RegionalDistributionChart({ data }: RegionalDistributionChartProps) {
  const muiData = data.map((item, index) => ({
    id: index,
    value: item.count,
    label: item.region,
  }));

  // Unique colors for each region - expanded palette with no repeats
  const colors = [
    '#f59e0b', // Amber
    '#3b82f6', // Blue
    '#10b981', // Green
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#6366f1', // Indigo
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f97316', // Orange
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#a855f7', // Violet
    '#f43f5e', // Rose
    '#0ea5e9', // Sky
    '#22c55e', // Emerald
  ];

  return (
    <Card className="h-full border-muted/40 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2 border-b bg-muted/5 py-3">
        <CardTitle className="text-sm font-bold uppercase tracking-[0.15em]">Regional Distribution</CardTitle>
        <CardDescription className="text-xs mt-1">Customers by county/region</CardDescription>
      </CardHeader>
      <CardContent className="p-4 flex flex-col items-center justify-between min-h-[420px]">
        <div className="flex-1 flex items-center justify-center w-full py-4">
          <PieChart
            series={[
              {
                data: muiData,
                innerRadius: 40,
                outerRadius: 110,
                paddingAngle: 3,
                cornerRadius: 5,
                cx: 200,
                cy: 130,
              },
            ]}
            colors={colors}
            width={400}
            height={280}
            slotProps={{
              legend: {
                position: { vertical: 'middle', horizontal: 'end' },
              },
            }}
            sx={{
              "& .MuiChartsLegend-root": {
                display: "none",
              },
            }}
          />
        </div>

        {/* Custom Legend inside the card */}
        <div className="w-full space-y-3 pt-4 border-t border-muted/20">
          {/* First row: 4 items */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
            {muiData.slice(0, 4).map((item, index) => (
              <div key={item.id} className="flex items-center gap-2.5">
                <div 
                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm" 
                  style={{ backgroundColor: colors[index] }}
                />
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-xs font-bold uppercase tracking-tight">{item.label}</span>
                  <span className="text-sm font-bold">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Second row: remaining items */}
          {muiData.length > 4 && (
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3">
              {muiData.slice(4).map((item, index) => (
                <div key={item.id} className="flex items-center gap-2.5">
                  <div 
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm" 
                    style={{ backgroundColor: colors[index + 4] }}
                  />
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="text-xs font-bold uppercase tracking-tight">{item.label}</span>
                    <span className="text-sm font-bold">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
