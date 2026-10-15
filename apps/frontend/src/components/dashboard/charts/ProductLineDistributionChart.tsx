import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface ProductLineData {
  productLine: string;
  count: number;
}

interface ProductLineDistributionChartProps {
  data: ProductLineData[];
}

const chartConfig = {
  count: {
    label: "Lead Count",
    color: "hsl(258, 90%, 66%)",
  },
} satisfies ChartConfig;

export const ProductLineDistributionChart = React.memo(({ data }: ProductLineDistributionChartProps) => {
  const chartData = data.map((d) => ({
    productLine: d.productLine,
    count: d.count,
  }));

  return (
    <Card className="h-full border-muted/40 shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-2 border-b bg-muted/5 py-3">
        <CardTitle className="text-sm font-bold uppercase tracking-[0.15em]">Product Line Distribution</CardTitle>
        <CardDescription className="text-xs mt-1">Leads across different product lines</CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="productLine"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 10)}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={8} />
          </BarChart>
        </ChartContainer>
        
        {/* Custom Legend */}
        <div className="w-full flex justify-center pt-4 border-t border-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full shrink-0 shadow-sm bg-[hsl(258,90%,66%)]" />
            <span className="text-sm font-bold uppercase tracking-tight">Lead Count</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
