'use client';

import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { ScheduleAttendance, ScheduleEmployeeWithEmployee } from '@/types/schedule';
import { cn } from '@/lib/utils';

const statusStyle: Record<string, string> = {
  present: 'border-green-500/60 bg-green-50',
  overtime: 'border-amber-500/60 bg-amber-50',
  public_holiday: 'border-sky-500/60 bg-sky-50',
  sick_leave: 'border-violet-500/60 bg-violet-50',
  absent: 'border-red-500/60 bg-red-50',
};

function statusLabel(s: string | null | undefined): string {
  if (!s) return 'Not marked';
  const map: Record<string, string> = {
    present: 'Present',
    overtime: 'Overtime',
    public_holiday: 'Public holiday',
    sick_leave: 'Sick leave',
    absent: 'Absent',
  };
  return map[s] || s;
}

function nameOf(e: ScheduleEmployeeWithEmployee) {
  return (
    e.knownAs ||
    [e.FirstName, e.LastName].filter(Boolean).join(' ') ||
    'Unknown'
  );
}

export type AttendanceGridProps = {
  employees: ScheduleEmployeeWithEmployee[];
  byEmployee: Map<number, ScheduleAttendance>;
  saving: boolean;
  onCardTap: (emp: ScheduleEmployeeWithEmployee) => void;
  onEdit: (emp: ScheduleEmployeeWithEmployee) => void;
  pendingEmployeeIds?: Set<number>;
};

export function AttendanceGrid({
  employees,
  byEmployee,
  saving,
  onCardTap,
  onEdit,
  pendingEmployeeIds,
}: AttendanceGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {employees.map((emp) => {
        const row = byEmployee.get(emp.Employee_ID);
        const s = row?.Status;
        const isPending = pendingEmployeeIds?.has(emp.Employee_ID) ?? false;
        const cls = s ? statusStyle[s] ?? 'border-muted bg-muted/30' : 'border-muted bg-card';
        const hrs =
          row?.Hours_Worked != null
            ? `${row.Hours_Worked}h`
            : row?.Status === 'absent'
              ? '—'
              : '';

        return (
          <Card
            key={emp.Employee_ID}
            className={cn(
              'overflow-hidden border-2 transition-colors',
              cls,
              isPending && 'border-dashed'
            )}
          >
            <CardContent className="flex items-stretch gap-2 p-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => onCardTap(emp)}
                className="min-w-0 flex-1 rounded-lg py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="font-mono text-xs text-muted-foreground">{emp.EmplNo}</div>
                <div className="truncate text-lg font-semibold">{nameOf(emp)}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{statusLabel(s)}</span>
                  {isPending && (
                    <span className="rounded bg-orange-100 px-1.5 text-xs font-medium text-orange-700">
                      unsaved
                    </span>
                  )}
                  {hrs ? <span className="text-muted-foreground">{hrs}</span> : null}
                  {(row?.Overtime_Hours ?? 0) > 0 && s !== 'public_holiday' && s !== 'sick_leave' ? (
                    <span className="rounded bg-amber-100 px-1.5 text-amber-900">
                      +{row?.Overtime_Hours}h OT
                    </span>
                  ) : null}
                </div>
                {row?.Absence_Reason && s === 'absent' ? (
                  <div className="mt-1 text-xs text-muted-foreground italic">
                    {row.Absence_Reason}
                  </div>
                ) : null}
              </button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="shrink-0 self-center"
                aria-label="Edit overtime or leave types"
                onClick={() => onEdit(emp)}
              >
                <Pencil className="h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
