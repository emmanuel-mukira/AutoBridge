import React, { useMemo, useState, useCallback, memo } from "react";
import { useAnalytics } from "@/features/analytics/hooks/useAnalytics";
import { useActivityHeatmap } from "@/features/analytics/hooks/useActivityHeatmap";
import { StatusDistributionChart } from "@/components/dashboard/charts/StatusDistributionChart";
import { MonthlyTrendsChart } from "@/components/dashboard/charts/MonthlyTrendsChart";
import { RegionalDistributionChart } from "@/components/dashboard/charts/RegionalDistributionChart";
import { useMonthlyTrends } from "@/features/analytics/hooks/useMonthlyTrends";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Target, TrendingUp, Calendar, Trophy, Briefcase, Award, Star, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/app/auth/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { SalesRepPerformance, QuickFilterType } from "@/features/analytics/types";
import { useSetQuickFilter } from "@/features/analytics/store/analyticsStore";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/shared/TablePagination";

const StatCard = memo(function StatCard({ 
  title, 
  value, 
  icon, 
  loading, 
  variant = "default"
}: { 
  title: string; 
  value?: string | number; 
  icon: React.ReactNode; 
  loading: boolean;
  variant?: "default" | "success" | "blue" | "purple";
}) {
  const bgStyles = useMemo(() => ({
    default: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    success: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
    blue: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
  }), []);

  const borderStyles = useMemo(() => ({
    default: "border-b-blue-500/30",
    success: "border-b-emerald-500/30",
    blue: "border-b-indigo-500/30",
    purple: "border-b-purple-500/30"
  }), []);

  return (
    <Card className={cn(
      "overflow-hidden border border-muted/20 transition-shadow hover:shadow-xl group",
      "bg-card border-b-2",
      "shadow-[0_4px_12px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
      borderStyles[variant]
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">{title}</p>
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold tracking-tight">{value ?? 0}</div>
            )}
          </div>
          <div className={cn("p-2.5 rounded-xl transition-transform group-hover:scale-110", bgStyles[variant])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

const HeatmapCell = memo(function HeatmapCell({ 
  dayNum, 
  count, 
  cellDate, 
  maxActivitiesForScale,
  KENYA_TIMEZONE 
}: { 
  dayNum: number; 
  count: number; 
  cellDate: Date; 
  maxActivitiesForScale: number;
  KENYA_TIMEZONE: string;
}) {
  const formattedDate = useMemo(() => 
    cellDate.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: KENYA_TIMEZONE
    }),
    [cellDate, KENYA_TIMEZONE]
  );
  
  const intensity = Math.min(count / maxActivitiesForScale, 1);
  const bgColor = count > 0 
    ? `rgba(59, 130, 246, ${0.2 + intensity * 0.8})` 
    : 'rgba(148, 163, 184, 0.05)';
  const borderColor = count > 0
    ? `rgba(59, 130, 246, ${0.2 + intensity * 0.3})`
    : 'rgba(148, 163, 184, 0.15)';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "h-10 rounded-md transition-all duration-200 hover:scale-105 cursor-default relative",
            count > 0 ? "shadow-sm" : ""
          )}
          style={{ 
            backgroundColor: bgColor,
            border: `1.5px solid ${borderColor}`
          }}
        >
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-foreground/70">
            {dayNum}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="p-0 border-none bg-transparent shadow-none overflow-visible">
        <div className="bg-zinc-900 text-zinc-50 border border-zinc-800 rounded-lg p-2.5 shadow-xl animate-in fade-in zoom-in duration-200">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <div className={cn("w-2.5 h-2.5 rounded-full", count > 0 ? "bg-blue-500 animate-pulse" : "bg-zinc-700")} />
              <span className="font-bold text-sm tracking-tight">{count} Activities</span>
            </div>
            <div className="h-px bg-zinc-800 w-full" />
            <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">{formattedDate}</span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
});

const ActivityHeatmap = memo(function ActivityHeatmap() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const { data: heatmapData, isLoading: isHeatmapLoading } = useActivityHeatmap(selectedMonth.year, selectedMonth.month);

  const KENYA_TIMEZONE = 'Africa/Nairobi';
  
  const kenyaFormatter = useMemo(() => new Intl.DateTimeFormat('en-US', {
    timeZone: KENYA_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }), [KENYA_TIMEZONE]);

  const getKenyaDateParts = useCallback((date: Date) => {
    const parts = kenyaFormatter.formatToParts(date);
    const year = Number(parts.find((p) => p.type === 'year')?.value ?? 0);
    const month = Number(parts.find((p) => p.type === 'month')?.value ?? 1) - 1;
    const day = Number(parts.find((p) => p.type === 'day')?.value ?? 1);
    return { year, month, day };
  }, [kenyaFormatter]);

  const daysInMonth = useMemo(() => 
    new Date(selectedMonth.year, selectedMonth.month + 1, 0).getDate(),
    [selectedMonth.year, selectedMonth.month]
  );
  
  const firstDayOfMonth = useMemo(() => 
    new Date(selectedMonth.year, selectedMonth.month, 1).getDay(),
    [selectedMonth.year, selectedMonth.month]
  );
  
  const monthName = useMemo(() => 
    new Date(selectedMonth.year, selectedMonth.month, 1).toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    }),
    [selectedMonth.year, selectedMonth.month]
  );

  const goToPreviousMonth = useCallback(() => {
    setSelectedMonth(prev => {
      const newMonth = prev.month - 1;
      if (newMonth < 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { year: prev.year, month: newMonth };
    });
  }, []);

  const currentKenyaParts = useMemo(() => {
    const now = new Date();
    return getKenyaDateParts(now);
  }, [getKenyaDateParts]);

  const goToNextMonth = useCallback(() => {
    if (selectedMonth.year === currentKenyaParts.year && selectedMonth.month === currentKenyaParts.month) {
      return;
    }
    setSelectedMonth(prev => {
      const newMonth = prev.month + 1;
      if (newMonth > 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { year: prev.year, month: newMonth };
    });
  }, [selectedMonth.year, selectedMonth.month, currentKenyaParts.year, currentKenyaParts.month]);

  const isCurrentMonth = useMemo(() => 
    selectedMonth.year === currentKenyaParts.year && selectedMonth.month === currentKenyaParts.month,
    [selectedMonth.year, selectedMonth.month, currentKenyaParts.year, currentKenyaParts.month]
  );

  const maxActivitiesForScale = useMemo(() => {
    if (!heatmapData?.[0]) return 4;
    const maxVal = Math.max(...heatmapData[0]);
    return maxVal > 0 ? maxVal : 4;
  }, [heatmapData]);

  if (isHeatmapLoading) {
    return <Skeleton className="h-[300px] w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-muted/20">
        <button
          onClick={goToPreviousMonth}
          className="p-2 rounded-md hover:bg-muted/50 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="text-sm font-semibold text-foreground">{monthName}</h3>
        <button
          onClick={goToNextMonth}
          disabled={isCurrentMonth}
          className="p-2 rounded-md hover:bg-muted/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <TooltipProvider delayDuration={0}>
        <div className="grid grid-cols-7 gap-1.5">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs text-foreground font-semibold uppercase tracking-tight">
              {day}
            </div>
          ))}
          
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="h-10" />
          ))}
          
          {Array.from({ length: daysInMonth }).map((_, dayIndex) => {
            const dayNum = dayIndex + 1;
            const cellDate = new Date(selectedMonth.year, selectedMonth.month, dayNum);
            const count = heatmapData?.[0]?.[dayIndex] || 0;

            return (
              <HeatmapCell
                key={dayNum}
                dayNum={dayNum}
                count={count}
                cellDate={cellDate}
                maxActivitiesForScale={maxActivitiesForScale}
                KENYA_TIMEZONE={KENYA_TIMEZONE}
              />
            );
          })}
        </div>
      </TooltipProvider>

      <div className="flex items-center justify-between pt-4 border-t border-muted/20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500/50" />
          <span className="text-xs text-muted-foreground font-semibold">Activity Level</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-medium">Less</span>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4].map((level) => {
              const intensity = level === 0 ? 0 : level / 4;
              return (
                <div 
                  key={level} 
                  className="w-4 h-4 rounded-sm border border-muted/20" 
                  style={{ 
                    backgroundColor: level === 0 
                      ? 'rgba(148, 163, 184, 0.1)' 
                      : `rgba(59, 130, 246, ${0.2 + intensity * 0.8})` 
                  }} 
                />
              );
            })}
          </div>
          <span className="text-xs text-muted-foreground font-medium">More (4+)</span>
        </div>
      </div>
    </div>
  );
});

const SalesRepPerformanceTable = memo(function SalesRepPerformanceTable({ data }: { data: SalesRepPerformance[] }) {
  const sortedData = useMemo(() => [...data].sort((a, b) => b.totalValue - a.totalValue), [data]);
  
  const {
    paged,
    page,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
  } = usePagination(sortedData, { initialPageSize: 10 });

  return (
    <Card className="shadow-sm border-muted/40 overflow-hidden">
      <CardHeader className="border-b bg-muted/5 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
            <span className="truncate">Sales Rep Performance</span>
          </CardTitle>
          <div className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Ranked by Revenue
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto -mx-px scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          <div className="min-w-full inline-block align-middle">
            <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[60px] sm:w-[80px] text-center text-xs">Rank</TableHead>
                <TableHead className="min-w-[140px] text-xs">Representative</TableHead>
                <TableHead className="text-right min-w-[80px]">
                  <div className="flex items-center justify-end gap-1">
                    <Target className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                    <span className="text-xs">Leads</span>
                  </div>
                </TableHead>
                <TableHead className="text-right min-w-[70px]">
                  <div className="flex items-center justify-end gap-1">
                    <Award className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                    <span className="text-xs">Won</span>
                  </div>
                </TableHead>
                <TableHead className="text-right min-w-[100px]">
                  <div className="flex items-center justify-end gap-1">
                    <Briefcase className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500" />
                    <span className="text-xs">Revenue</span>
                  </div>
                </TableHead>
                <TableHead className="text-right min-w-[90px]">
                  <div className="flex items-center justify-end gap-1">
                    <Star className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500" />
                    <span className="text-xs hidden sm:inline">Conv. Rate</span>
                    <span className="text-xs sm:hidden">Rate</span>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {paged.length > 0 ? (
              paged.map((rep, index) => {
                const actualIndex = (page - 1) * pageSize + index;
                return (
                <TableRow key={rep.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="text-center font-bold">
                    {actualIndex === 0 ? (
                      <div className="flex justify-center">
                        <div className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center border border-yellow-200 dark:border-yellow-800 text-[10px] sm:text-xs">
                          1
                        </div>
                      </div>
                    ) : actualIndex === 1 ? (
                      <div className="flex justify-center">
                        <div className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700 text-[10px] sm:text-xs">
                          2
                        </div>
                      </div>
                    ) : actualIndex === 2 ? (
                      <div className="flex justify-center">
                        <div className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-500 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center border border-amber-100 dark:border-amber-900/40 text-[10px] sm:text-xs">
                          3
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] sm:text-xs">{actualIndex + 1}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border border-muted-foreground/10 shrink-0">
                        <AvatarImage src={`https://avatar.iran.liara.run/username?username=${rep.name}`} />
                        <AvatarFallback className="text-[9px] sm:text-[10px] bg-primary/5 text-primary">
                          {rep.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-[11px] sm:text-xs leading-none truncate">{rep.name}</span>
                        <span className="text-[8px] sm:text-[9px] text-muted-foreground uppercase tracking-tighter mt-0.5">Sales Rep</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium text-[11px] sm:text-xs">{rep.totalLeads}</TableCell>
                  <TableCell className="text-right font-medium text-green-600 dark:text-green-400 text-[11px] sm:text-xs">
                    {rep.wonLeads}
                  </TableCell>
                  <TableCell className="text-right font-bold text-[11px] sm:text-xs whitespace-nowrap">
                    ${rep.totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-800 whitespace-nowrap">
                      {rep.conversionRate}%
                    </div>
                  </TableCell>
                </TableRow>
              );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground text-sm">
                  No representative performance data found for this period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          </Table>
          </div>
        </div>
      </CardContent>
      <TablePagination
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        totalCount={sortedData.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </Card>
  );
});

function getEventCount(events: { event: string; count: number }[] | undefined, name: string): number {
  return events?.find((e) => e.event === name)?.count ?? 0;
}

function Dashboard() {
  const { data, isLoading, isFetching, error } = useAnalytics();
  const { data: trendsData, isLoading: trendsLoading } = useMonthlyTrends();
  const { user } = useAuth();
  const setQuickFilter = useSetQuickFilter();

  const eventLeadsCreated = useMemo(() => getEventCount(data?.events, 'lead_created'), [data?.events]);
  const eventLeadsWon = useMemo(() => getEventCount(data?.events, 'lead_won'), [data?.events]);
  const eventLeadsLost = useMemo(() => getEventCount(data?.events, 'lead_lost'), [data?.events]);
  const eventCustomersCreated = useMemo(() => getEventCount(data?.events, 'customer_created'), [data?.events]);
  const eventConversionRate = useMemo(() => {
    const decided = eventLeadsWon + eventLeadsLost;
    return decided > 0 ? Math.round((eventLeadsWon / decided) * 100) : 0;
  }, [eventLeadsWon, eventLeadsLost]);

  const currentDate = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }, []);

  const handleQuickFilterChange = useCallback((value: string) => {
    setQuickFilter(value as QuickFilterType);
  }, [setQuickFilter]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
          <Target className="h-6 w-6" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold">Unable to load analytics</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            {error instanceof Error ? error.message : "An unknown error occurred while fetching your dashboard data."}
          </p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 overflow-x-hidden">
      {/* Welcome & Filter Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-2 sm:gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {isLoading ? <Skeleton className="h-9 w-64" /> : `Hello, ${user?.firstName || 'Admin'}`}
          </h1>
          <div className="text-sm text-muted-foreground">
            {isLoading ? (
              <Skeleton className="h-5 w-full max-w-md" />
            ) : (
              "Overview of AutoBridge CRM operations for the current period."
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Current Date Display */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-card/80 backdrop-blur-sm rounded-xl border border-muted/20 shadow-sm">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold tracking-tight">{currentDate}</span>
          </div>

          <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm p-1 rounded-xl border border-muted/20 shadow-sm">
            <div className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-r border-muted/20">
              <Filter className="h-3 w-3" />
              <span>Range</span>
            </div>
            <Tabs defaultValue="month" onValueChange={handleQuickFilterChange} className="w-auto">
              <TabsList className="flex bg-transparent h-auto p-0.5 gap-0.5">
                {[
                  { value: 'month', label: 'Month' },
                  { value: 'quarter', label: 'Quarter' },
                  { value: 'year', label: 'Year' },
                  { value: 'max', label: 'Max' }
                ].map((filter) => (
                  <TabsTrigger
                    key={filter.value}
                    value={filter.value}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/20 text-xs h-8 px-4 rounded-lg transition-all font-semibold"
                  >
                    {filter.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </section>

      {/* Summary Statistics — powered by TimescaleDB event counts */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Leads Created"
          value={eventLeadsCreated}
          icon={<Target className="h-4 w-4" />}
          loading={isLoading}
          variant="default"
        />
        <StatCard
          title="Leads Won"
          value={eventLeadsWon}
          icon={<TrendingUp className="h-4 w-4" />}
          loading={isLoading}
          variant="success"
        />
        <StatCard
          title="Conversion Rate"
          value={data ? `${eventConversionRate}%` : undefined}
          icon={<TrendingUp className="h-4 w-4" />}
          loading={isLoading}
          variant="blue"
        />
        <StatCard
          title="Customers Created"
          value={eventCustomersCreated}
          icon={<Users className="h-4 w-4" />}
          loading={isLoading}
          variant="purple"
        />
      </div>

      <div className="grid gap-3 grid-cols-1 lg:grid-cols-3">
        {/* Monthly Trends from TimescaleDB */}
        <div className="lg:col-span-2">
          {trendsLoading && !trendsData ? (
            <Skeleton className="h-[320px] w-full" />
          ) : (
            <MonthlyTrendsChart data={trendsData ?? []} />
          )}
        </div>

        {/* Lead Status Distribution */}
        <div className="lg:col-span-1">
          {isLoading && !data ? (
            <Skeleton className="h-[320px] w-full" />
          ) : (
            <StatusDistributionChart 
              data={data ? [
                { status: 'DRAFT', count: data.leads.draftLeads },
                { status: 'OPEN', count: data.leads.openLeads },
                { status: 'WON', count: data.leads.wonLeads },
                { status: 'LOST', count: data.leads.lostLeads },
              ].filter(d => d.count > 0) : []} 
            />
          )}
        </div>
      </div>

      {isFetching && data ? (
        <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest opacity-70">
          Updating...
        </div>
      ) : null}

      {/* Activity Heatmap */}
      <div>
          <Card className="h-full shadow-sm border-muted/40 overflow-hidden">
            <CardHeader className="border-b bg-muted/5 py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-primary" />
                Sales Activity Intensity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoading ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <ActivityHeatmap />
              )}
            </CardContent>
          </Card>
      </div>

      {data?.isAdmin && (
        <div className="w-full overflow-hidden">
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <SalesRepPerformanceTable data={data?.salesRepPerformance || []} />
          )}
        </div>
      )}

      {data?.isAdmin && (
        <div className="lg:col-span-12">
          {isLoading ? (
            <Skeleton className="h-[350px] w-full" />
          ) : (
            <RegionalDistributionChart data={data?.customers.regionalDistribution || []} />
          )}
        </div>
      )}
    </div>
  );
}

export default memo(Dashboard);
