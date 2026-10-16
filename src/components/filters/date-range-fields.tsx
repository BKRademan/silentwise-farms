'use client';

import { AlertTriangle } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';

interface DateRangeFieldsProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
}

/** Start/end date pickers rendered as two grid cells, plus an inverted-range warning. */
export function DateRangeFields({ startDate, endDate, onStartDateChange, onEndDateChange }: DateRangeFieldsProps) {
  const isInverted = Boolean(startDate && endDate && startDate > endDate);

  return (
    <>
      <DatePicker
        date={startDate}
        onSelect={(date) => date && onStartDateChange(date)}
        placeholder="Start date"
        className={isInverted ? 'border-red-500 text-red-600' : undefined}
      />
      <DatePicker
        date={endDate}
        onSelect={(date) => date && onEndDateChange(date)}
        placeholder="End date"
        className={isInverted ? 'border-red-500 text-red-600' : undefined}
      />
      {isInverted && (
        <div className="col-span-full flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>Start date is after end date, so no records will be returned.</span>
        </div>
      )}
    </>
  );
}
