import * as React from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";
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
  title?: string;
  description?: string;
}

const displayLabels: Record<string, string> = {
  "Car Accessories": "Accessories",
  "Car Electronics": "Electronics",
  "Performance & Non-auto": "Performance / RV",
  "Tires & Wheels": "Tires",
};

const barOpacities = [1, 0.82, 0.68, 0.54];

const chartConfig = {
  count: {
    label: "Opportunities",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export const ProductLineDistributionChart = React.memo(function ProductLineDistributionChart({
  data,
  title = "Product group distribution",
  description = "Opportunities by automotive product group",
}: ProductLineDistributionChartProps) {
  const chartData = data.map((item, index) => ({
    productLine: item.productLine,
    displayLabel: displayLabels[item.productLine] ?? item.productLine,
    count: item.count,
    opacity: barOpacities[index % barOpacities.length],
  }));
  const chartHeight = Math.min(250, Math.max(150, chartData.length * 48 + 42));

  if (data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-[0.15em]">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-44 items-center justify-center text-sm text-muted-foreground">
          No product data for this period.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full overflow-hidden border-muted/40 bg-card/50 shadow-sm backdrop-blur-sm">
      <CardHeader className="border-b bg-muted/5 py-3">
        <CardTitle className="text-sm font-bold uppercase tracking-[0.15em]">{title}</CardTitle>
        <CardDescription className="mt-1 text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <ChartContainer config={chartConfig} className="min-h-0 w-full aspect-auto" style={{ height: chartHeight }}>
          <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 4, right: 34, top: 4, bottom: 4 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis
              type="number"
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              domain={[0, (maximum: number) => Math.max(1, Math.ceil(maximum * 1.15))]}
            />
            <YAxis
              type="category"
              dataKey="displayLabel"
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              width={108}
              interval={0}
            />
            <ChartTooltip
              cursor={{ fill: "var(--muted)", opacity: 0.35 }}
              content={
                <ChartTooltipContent
                  labelFormatter={(_label, payload) => payload[0]?.payload.productLine ?? ""}
                  formatter={(value) => (
                    <div className="flex min-w-32 flex-1 items-center justify-between gap-4">
                      <span className="text-muted-foreground">Opportunities</span>
                      <span className="font-mono font-medium tabular-nums text-foreground">{Number(value).toLocaleString()}</span>
                    </div>
                  )}
                />
              }
            />
            <Bar dataKey="count" maxBarSize={26} radius={[0, 5, 5, 0]}>
              {chartData.map((item) => <Cell key={item.productLine} fill="var(--primary)" fillOpacity={item.opacity} />)}
              <LabelList dataKey="count" position="right" className="fill-foreground font-medium" />
            </Bar>
          </BarChart>
        </ChartContainer>

        <div className="grid gap-x-5 gap-y-2 border-t border-muted/40 pt-3 sm:grid-cols-2" aria-label="Product group legend">
          {chartData.map((item) => (
            <div key={item.productLine} className="flex min-w-0 items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-primary" style={{ opacity: item.opacity }} />
              <span className="min-w-0 flex-1 text-muted-foreground">{item.productLine}</span>
              <span className="font-semibold tabular-nums">{item.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
