import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
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

interface MonthlyTrendData {
  month: string;
  year: number;
  created: number;
  won: number;
}

interface MonthlyTrendsChartProps {
  data: MonthlyTrendData[];
}

const chartConfig = {
  created: {
    label: "Created",
    color: "hsl(217, 91%, 65%)",
  },
  won: {
    label: "Won",
    color: "hsl(142, 76%, 45%)",
  },
} satisfies ChartConfig;

export const MonthlyTrendsChart = React.memo(function MonthlyTrendsChart({ data }: MonthlyTrendsChartProps) {
  // Detect if this is daily data (day numbers in month field) or monthly data
  const isDailyData = data.length > 0 && /^\d+\s/.test(data[0].month);

  const chartData = React.useMemo(() => {
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const getMonthIndex = (label: string): number => Math.max(0, monthLabels.indexOf(label));
    const parseDate = (item: MonthlyTrendData): Date => {
      const match = item.month.match(/^(\d+)\s+(\w+)/);
      const monthLabel = match?.[2] ?? item.month;
      const day = match ? Number(match[1]) : 1;
      return new Date(Date.UTC(item.year, getMonthIndex(monthLabel), day));
    };
    const sortedData = [...data].sort((left, right) => parseDate(left).getTime() - parseDate(right).getTime());
    if (sortedData.length === 0) {
      return [];
    }
    const dataByKey = new Map<string, { created: number; won: number }>();
    sortedData.forEach((item) => {
      const match = item.month.match(/^(\d+)\s+(\w+)/);
      const monthLabel = match?.[2] ?? item.month;
      const day = match ? Number(match[1]) : 1;
      const monthIndex = getMonthIndex(monthLabel);
      const key = `${item.year}-${monthIndex}-${day}`;
      dataByKey.set(key, { created: item.created, won: item.won });
    });
    if (isDailyData) {
      const startDate = parseDate(sortedData[0]);
      const endDate = parseDate(sortedData[sortedData.length - 1]);
      const monthEnd = new Date(
        Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() + 1, 0),
      );
      const rangeEnd = endDate < monthEnd ? monthEnd : endDate;
      const points: { displayLabel: string; created: number; won: number; key: string }[] = [];
      for (
        let current = new Date(startDate);
        current <= rangeEnd;
        current.setUTCDate(current.getUTCDate() + 1)
      ) {
        const year = current.getUTCFullYear();
        const monthIndex = current.getUTCMonth();
        const day = current.getUTCDate();
        const key = `${year}-${monthIndex}-${day}`;
        const value = dataByKey.get(key) ?? { created: 0, won: 0 };
        points.push({
          displayLabel: `${day} ${monthLabels[monthIndex]}`,
          created: value.created,
          won: value.won,
          key: `${key}`,
        });
      }
      return points;
    }
    const startDate = parseDate(sortedData[0]);
    const endDate = parseDate(sortedData[sortedData.length - 1]);
    const points: { displayLabel: string; created: number; won: number; key: string }[] = [];
    let year = startDate.getUTCFullYear();
    let monthIndex = startDate.getUTCMonth();
    const endYear = endDate.getUTCFullYear();
    const endMonth = endDate.getUTCMonth();
    const spansMultipleYears = endYear > startDate.getUTCFullYear();
    while (year < endYear || (year === endYear && monthIndex <= endMonth)) {
      const key = `${year}-${monthIndex}-1`;
      const value = dataByKey.get(key) ?? { created: 0, won: 0 };
      const label = spansMultipleYears
        ? `${monthLabels[monthIndex]} ${String(year).slice(2)}`
        : monthLabels[monthIndex];
      points.push({
        displayLabel: label,
        created: value.created,
        won: value.won,
        key: `${year}-${monthIndex}`,
      });
      monthIndex += 1;
      if (monthIndex > 11) {
        monthIndex = 0;
        year += 1;
      }
    }
    return points;
  }, [data, isDailyData]);

  if (data.length === 0) {
    return (
      <Card className="h-full border border-muted/20 shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] overflow-hidden bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3 border-b bg-muted/5">
          <CardTitle className="text-lg font-bold">Monthly Lead Trends</CardTitle>
          <CardDescription className="text-sm mt-1">Leads created vs. won over time</CardDescription>
        </CardHeader>
        <CardContent className="p-6 flex items-center justify-center min-h-[240px]">
          <p className="text-sm text-muted-foreground">No data available for this period</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full border border-muted/20 shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)] overflow-hidden bg-card/80 backdrop-blur-sm relative group">
      <CardHeader className="pb-3 border-b bg-muted/5">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold">Monthly Lead Trends</CardTitle>
            <CardDescription className="text-sm mt-1">Leads created vs. won over time</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-0.5 bg-[hsl(217,91%,65%)] rounded-full" />
              <span className="text-xs font-medium">Created</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="24" height="4" viewBox="0 0 24 4">
                <line x1="0" y1="2" x2="24" y2="2" stroke="hsl(142,76%,45%)" strokeWidth="2" strokeDasharray="4 2" />
              </svg>
              <span className="text-xs font-medium">Won</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
              top: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="displayLabel"
              tickLine={false}
              axisLine={false}
              interval={chartData.length > 12 ? Math.ceil(chartData.length / 12) - 1 : 0}
              minTickGap={20}
              tickMargin={8}
              tickFormatter={(value) => {
                if (isDailyData) {
                  const match = value.match(/^(\d+)/);
                  return match ? match[1] : value;
                }
                return value;
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              allowDecimals={false}
              domain={[0, (dataMax: number) => Math.max(1, Math.ceil(dataMax * 1.2))]}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <defs>
              <linearGradient id="fillWon" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-won)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--color-won)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            {/* Won rendered first (below) — dashed green line with subtle fill */}
            <Area
              dataKey="won"
              type="monotone"
              fill="url(#fillWon)"
              fillOpacity={1}
              stroke="var(--color-won)"
              strokeWidth={2}
              strokeDasharray="5 3"
            />
            {/* Created rendered last (on top) — solid blue line, no fill so Won is always visible beneath */}
            <Area
              dataKey="created"
              type="monotone"
              fill="transparent"
              fillOpacity={0}
              stroke="var(--color-created)"
              strokeWidth={2.5}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
});
