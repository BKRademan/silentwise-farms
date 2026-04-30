'use client';

import { eachDayOfInterval, format, isSameDay } from 'date-fns';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type DayNavigatorProps = {
  start: Date;
  end: Date;
  selected: Date;
  onSelect: (d: Date) => void;
  isDayComplete: (d: Date) => boolean;
};

export function DayNavigator({
  start,
  end,
  selected,
  onSelect,
  isDayComplete,
}: DayNavigatorProps) {
  const days = eachDayOfInterval({ start, end });

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 pt-1 [-webkit-overflow-scrolling:touch]">
      {days.map((d) => {
        const isSel = isSameDay(d, selected);
        const done = isDayComplete(d);
        return (
          <button
            key={d.toISOString()}
            type="button"
            onClick={() => onSelect(d)}
            className={cn(
              'flex min-w-[4.25rem] shrink-0 flex-col items-center rounded-xl border px-3 py-2 text-xs transition-colors',
              isSel
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-card hover:bg-muted/80'
            )}
          >
            <span className="font-medium">{format(d, 'EEE')}</span>
            <span className="text-lg font-semibold tabular-nums">{format(d, 'd')}</span>
            {done ? (
              <Check className={cn('mt-0.5 h-4 w-4', isSel ? 'text-primary-foreground' : 'text-green-600')} />
            ) : (
              <span className="mt-0.5 h-4 w-4" aria-hidden />
            )}
          </button>
        );
      })}
    </div>
  );
}
