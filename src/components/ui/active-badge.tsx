import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function ActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(isActive ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-100 text-gray-600')}
    >
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  );
}
