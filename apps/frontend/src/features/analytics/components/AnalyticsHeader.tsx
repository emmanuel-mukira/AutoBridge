import { RefreshCw } from 'lucide-react';
import { DateRangeSelector } from './DateRangeSelector';

interface AnalyticsHeaderProps {
  isAdmin: boolean;
  lastUpdated: Date;
}

export function AnalyticsHeader({ isAdmin, lastUpdated }: AnalyticsHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          {isAdmin ? 'Analytics Dashboard' : 'My Performance'}
        </h1>
        <div className="flex items-center text-sm text-muted-foreground">
          <p>
            {isAdmin ? 'System-wide insights and metrics' : 'Track your sales performance'}
          </p>
          <span className="mx-2">•</span>
          <div className="flex items-center">
            <RefreshCw className="mr-1 h-3 w-3 animate-spin duration-[3000ms]" />
            Updated {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>
      
      <DateRangeSelector />
    </div>
  );
}
