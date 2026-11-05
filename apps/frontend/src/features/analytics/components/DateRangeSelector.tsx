import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useDateRange, useSetQuickFilter } from '../store/analyticsStore';
import type { QuickFilterType } from '../types';

export function DateRangeSelector() {
  const dateRange = useDateRange();
  const setQuickFilter = useSetQuickFilter();
  const [selectedFilter, setSelectedFilter] = useState<QuickFilterType>('month');

  const quickFilters: { label: string; value: QuickFilterType }[] = [
    { label: 'Month', value: 'month' },
    { label: 'Quarter', value: 'quarter' },
    { label: 'Year', value: 'year' },
  ];

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <div className="flex items-center rounded-lg border bg-muted/40 p-1">
        {quickFilters.map((filter) => (
          <Button
            key={filter.value}
            variant={selectedFilter === filter.value ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => {
              setSelectedFilter(filter.value);
              setQuickFilter(filter.value);
            }}
            className="h-8 px-3 text-xs"
            aria-pressed={selectedFilter === filter.value}
          >
            {filter.label}
          </Button>
        ))}
      </div>
      <p className="text-xs font-medium text-muted-foreground">
        {format(dateRange.from, 'MMM d, y')} – {format(dateRange.to, 'MMM d, y')}
      </p>
    </div>
  );
}
