'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DatePickerProps {
  date?: Date;
  onSelect?: (date: Date | undefined) => void;
  className?: string;
  placeholder?: string;
  disableFuture?: boolean;
}

export function DatePicker({
  date,
  onSelect,
  className,
  placeholder = 'Pick a date',
  disableFuture = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={'outline'}
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'PPP') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      {/* Wrapper keeps the calendar clickable when rendered inside a modal dialog. */}
      <div className="z-[9999] fixed">
        <PopoverContent className="w-auto p-0" align="start">
          <div className="bg-white rounded-md border shadow-md" style={{ pointerEvents: 'auto' }}>
            <Calendar
              mode="single"
              selected={date}
              defaultMonth={date}
              onSelect={(selected) => {
                onSelect?.(selected);
                if (selected) setOpen(false);
              }}
              disabled={disableFuture ? (day) => day > new Date() : undefined}
              initialFocus
            />
          </div>
        </PopoverContent>
      </div>
    </Popover>
  );
}
