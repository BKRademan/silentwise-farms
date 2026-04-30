'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { useData } from '@/lib/contexts/data-context';
import { Combobox } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EmployeePicker } from '@/components/schedules/employee-picker';
import type { RecentEmployeeForGrower, ScheduleDetail } from '@/types/schedule';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

interface ScheduleFormProps {
  scheduleId?: number;
  initialData?: ScheduleDetail;
}

export function ScheduleForm({ scheduleId, initialData }: ScheduleFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { growers, employees, isLoading: dataLoading } = useData();

  const today = new Date();
  const [growerId, setGrowerId] = useState<string>(
    initialData ? String(initialData.Grower_ID) : ''
  );
  const [startDate, setStartDate] = useState<Date>(() =>
    initialData
      ? new Date(initialData.Start_Date)
      : startOfWeek(today, { weekStartsOn: 1 })
  );
  const [endDate, setEndDate] = useState<Date>(() =>
    initialData
      ? new Date(initialData.End_Date)
      : endOfWeek(today, { weekStartsOn: 1 })
  );
  const [recent, setRecent] = useState<RecentEmployeeForGrower[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    initialData
      ? new Set(initialData.employees.map((e) => e.Employee_ID))
      : new Set()
  );
  const [submitting, setSubmitting] = useState(false);

  const growerOptions = useMemo(
    () =>
      growers.map((g) => ({
        value: String(g.ID),
        label: g.GrowerName || `Grower ${g.ID}`,
      })),
    [growers]
  );

  const loadRecent = useCallback(async (gid: number, autoSelect: boolean = true) => {
    setLoadingRecent(true);
    try {
      const res = await fetch(`/api/schedules/recent-employees?growerId=${gid}&days=60`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load recent employees');
      const list = json.data as RecentEmployeeForGrower[];
      setRecent(list);
      if (autoSelect) {
        setSelectedIds(new Set(list.map((e) => e.ID)));
      }
    } catch (e) {
      console.error(e);
      toast({
        title: 'Could not load recent employees',
        variant: 'destructive',
      });
      setRecent([]);
      if (autoSelect) {
        setSelectedIds(new Set());
      }
    } finally {
      setLoadingRecent(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!growerId) {
      if (!initialData) {
        setRecent([]);
        setSelectedIds(new Set());
      }
      return;
    }
    const id = parseInt(growerId, 10);
    const isEditing = !!initialData;
    if (!Number.isNaN(id)) loadRecent(id, !isEditing);
  }, [growerId, loadRecent, initialData]);

  const onToggle = (id: number, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!growerId) {
      toast({ title: 'Select a grower', variant: 'destructive' });
      return;
    }
    if (selectedIds.size === 0) {
      toast({ title: 'Select at least one employee', variant: 'destructive' });
      return;
    }
    if (endDate < startDate) {
      toast({ title: 'End date must be on or after start date', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const isEdit = !!scheduleId;
      const url = isEdit ? `/api/schedules/${scheduleId}` : '/api/schedules';
      const method = isEdit ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Grower_ID: parseInt(growerId, 10),
          Start_Date: format(startDate, 'yyyy-MM-dd'),
          End_Date: format(endDate, 'yyyy-MM-dd'),
          employeeIds: Array.from(selectedIds),
          status: 'draft',
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Save failed');
      
      const id = isEdit ? scheduleId : (json.data.id as number);
      toast({ title: isEdit ? 'Schedule updated' : 'Schedule created' });
      router.push(`/schedules/${id}/attendance`);
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Save failed',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">
          {scheduleId ? 'Edit schedule' : 'New schedule'}
        </h1>
        <Button type="button" variant="outline" asChild>
          <Link href="/schedules">Back</Link>
        </Button>
      </div>

      <div className="space-y-2">
        <Label>Grower</Label>
        <Combobox
          options={growerOptions}
          value={growerId}
          onValueChange={setGrowerId}
          placeholder="Select grower..."
          disabled={!!scheduleId}
        />
        {scheduleId && (
          <p className="text-xs text-muted-foreground">
            Cannot change grower for existing schedule
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Start date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn('w-full justify-start text-left font-normal')}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(startDate, 'PPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(d) => d && setStartDate(d)}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>End date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn('w-full justify-start text-left font-normal')}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(endDate, 'PPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(d) => d && setEndDate(d)}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {growerId && (
        <>
          {loadingRecent ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading recent employees…
            </div>
          ) : (
            <EmployeePicker
              recent={recent}
              allEmployees={employees}
              selectedIds={selectedIds}
              onToggle={onToggle}
            />
          )}
        </>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={submitting || !growerId}>
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving…
          </>
        ) : scheduleId ? (
          'Update schedule'
        ) : (
          'Create schedule'
        )}
      </Button>
    </form>
  );
}
