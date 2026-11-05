import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  compact?: boolean;
}

export function MetricCard({ title, value, description, icon: Icon, compact = false }: MetricCardProps) {
  return (
    <Card className="min-w-0">
      <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${compact ? "p-4 pb-1" : "pb-2"}`}>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent className={compact ? "px-4 pb-4 pt-0" : undefined}>
        <div className={`break-words font-bold text-primary ${compact ? "text-xl" : "text-2xl"}`}>{value}</div>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}
