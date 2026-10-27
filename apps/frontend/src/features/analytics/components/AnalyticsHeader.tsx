import { CircleCheck } from 'lucide-react';
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
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <p>
            {isAdmin ? 'Operational pipeline and activity reporting' : 'Your pipeline and sales activity'}
          </p>
          <span aria-hidden="true">•</span>
          <div className="flex items-center font-medium text-emerald-700 dark:text-emerald-400">
            <CircleCheck className="mr-1 h-3.5 w-3.5" />
            Updated{' '}
            {lastUpdated.toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </div>
        </div>
      </div>
      
      <DateRangeSelector />
    </div>
  );
}
