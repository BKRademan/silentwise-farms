import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  accent?: string;
}

export function StatCard({ label, value, icon: Icon, accent = 'text-blue-600' }: StatCardProps) {
  return (
    <Card className="min-w-0 bg-white shadow-md hover:shadow-lg transition-shadow">
      <CardContent className="p-2 sm:p-6">
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate">{label}</p>
            <p className={cn('text-lg sm:text-2xl font-bold truncate', accent)}>{value}</p>
          </div>
          <Icon className={cn('h-4 w-4 sm:h-6 sm:w-6 flex-shrink-0 opacity-80', accent)} />
        </div>
      </CardContent>
    </Card>
  );
}
