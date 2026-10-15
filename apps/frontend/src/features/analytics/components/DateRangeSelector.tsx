import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useDateRange, useSetQuickFilter } from '../store/analyticsStore';
import type { QuickFilterType } from '../types';

export function DateRangeSelector() {
  const dateRange = useDateRange();
  const setQuickFilter = useSetQuickFilter();

  const quickFilters: { label: string; value: QuickFilterType }[] = [
    { label: 'Today', value: 'today' },
    { label: '7D', value: 'week' },
    { label: 'Month', value: 'month' },
    { label: 'Qtr', value: 'quarter' },
    { label: 'Year', value: 'year' },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-md border">
        {quickFilters.map((filter) => (
          <Button
            key={filter.value}
            variant="ghost"
            size="sm"
            onClick={() => setQuickFilter(filter.value)}
            className="h-8 text-xs"
          >
            {filter.label}
          </Button>
        ))}
      </div>
      
      <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-background">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">
          {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
        </span>
      </div>
    </div>
  );
}
