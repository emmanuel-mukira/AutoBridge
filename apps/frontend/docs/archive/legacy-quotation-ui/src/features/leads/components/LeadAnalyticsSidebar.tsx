import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, CheckCircle2, XCircle } from 'lucide-react';
import type { Lead } from '../types';
import { cn } from '@/lib/utils';

interface LeadAnalyticsSidebarProps {
  leads: Lead[];
}

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

function CircularProgress({ percentage, size = 120, strokeWidth = 10 }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90 drop-shadow-sm">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-primary transition-all duration-1000 ease-in-out"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold tracking-tighter">{percentage}%</span>
        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Win Rate</span>
      </div>
    </div>
  );
}

export function LeadAnalyticsSidebar({ leads }: LeadAnalyticsSidebarProps) {
  const analytics = useMemo(() => {
    const totalLeads = leads.length;
    const activeLeads = leads.filter(l => l.status === 'OPEN').length;
    const wonLeads = leads.filter(l => l.status === 'WON').length;
    const lostLeads = leads.filter(l => l.status === 'LOST').length;
    
    const conversionRate = totalLeads > 0 
      ? Math.round((wonLeads / (wonLeads + lostLeads)) * 100) || 0
      : 0;

    const avgAge = leads.length > 0
      ? Math.round(
          leads.reduce((sum, lead) => {
            const days = Math.floor(
              (new Date().getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24)
            );
            return sum + days;
          }, 0) / leads.length
        )
      : 0;

    return {
      totalLeads,
      activeLeads,
      wonLeads,
      lostLeads,
      conversionRate,
      avgAge,
    };
  }, [leads]);

  return (
    <div className="w-full sm:w-80 h-full shrink-0 space-y-6 p-4 sm:p-6 bg-card/50 backdrop-blur-sm border-l border-border/40 overflow-y-auto">
      <div className="space-y-1.5">
        <h2 className="text-lg font-bold tracking-tight">Pipeline Analytics</h2>
        <p className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">
          Real-time insights
        </p>
      </div>

      <Card className="border-border/40 bg-background/50 shadow-sm overflow-hidden group">
        <CardHeader className="pb-2 border-b bg-muted/5">
          <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Win Probability</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <CircularProgress percentage={analytics.conversionRate} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="border-border/40 bg-background/50 shadow-sm transition-all hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{analytics.activeLeads}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter mt-1">Active Leads</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-background/50 shadow-sm transition-all hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{analytics.avgAge}d</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter mt-1">Avg. Lead Age</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-background/50 shadow-sm transition-all hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{analytics.wonLeads}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter mt-1">Won Deals</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-background/50 shadow-sm transition-all hover:shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                <XCircle className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{analytics.lostLeads}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter mt-1">Lost Deals</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/40 bg-muted/30 shadow-inner">
        <CardContent className="p-5">
          <div className="space-y-4">
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Pipeline Split</h3>
            <div className="space-y-3">
              {[
                { label: 'Draft', count: leads.filter(l => l.status === 'DRAFT').length, color: 'bg-zinc-500' },
                { label: 'Open', count: analytics.activeLeads, color: 'bg-blue-500' },
                { label: 'Won', count: analytics.wonLeads, color: 'bg-green-500' },
                { label: 'Lost', count: analytics.lostLeads, color: 'bg-red-500' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-1.5 h-1.5 rounded-full", item.color)} />
                    <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0">
                    {item.count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
