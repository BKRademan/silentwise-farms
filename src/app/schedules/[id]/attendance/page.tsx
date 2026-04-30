'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  format,
  isSameDay,
  isWithinInterval,
  startOfDay,
} from 'date-fns';
import { Loader2, ArrowLeft, CheckCircle2, Upload, UserPlus } from 'lucide-react';
import { DayNavigator } from '@/components/schedules/day-navigator';
import { AttendanceGrid } from '@/components/schedules/attendance-grid';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { usePendingAttendance } from '@/hooks/use-pending-attendance';
import type { ScheduleAttendance, ScheduleDetail, ScheduleEmployeeWithEmployee } from '@/types/schedule';
import type { Employee } from '@/types/database';

function nextCycleStatus(
  s: string | null | undefined
): 'present' | 'absent' | 'unmarked' {
  if (!s) return 'present';
  if (s === 'absent') return 'unmarked';
  return 'absent';
}

export default function ScheduleAttendancePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const scheduleId = Number(params.id);

  const [detail, setDetail] = useState<ScheduleDetail | null>(null);
  const [rows, setRows] = useState<ScheduleAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Date>(() => new Date());
  const [editOpen, setEditOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<ScheduleEmployeeWithEmployee | null>(null);
  const [editAttendance, setEditAttendance] = useState<ScheduleAttendance | null>(null);
  const [overtimeInput, setOvertimeInput] = useState('0');
  const [ph, setPh] = useState(false);
  const [sick, setSick] = useState(false);
  const [absenceReason, setAbsenceReason] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const [unmarkedMessage, setUnmarkedMessage] = useState('');
  const [confirmFinalizeOpen, setConfirmFinalizeOpen] = useState(false);
  const [absenceDialogOpen, setAbsenceDialogOpen] = useState(false);
  const [absenceEmployee, setAbsenceEmployee] = useState<ScheduleEmployeeWithEmployee | null>(null);
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [dateRangeOption, setDateRangeOption] = useState<'single' | 'remaining'>('remaining');
  const [addingEmployee, setAddingEmployee] = useState(false);

  const {
    pendingCount,
    pendingMarksArray,
    setPendingMark,
    clearAll,
    getEffectiveStatus,
    getPendingForDay,
    getPendingMark,
  } = usePendingAttendance(scheduleId);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, aRes] = await Promise.all([
        fetch(`/api/schedules/${scheduleId}`),
        fetch(`/api/schedules/${scheduleId}/attendance`),
      ]);
      const dJson = await dRes.json();
      const aJson = await aRes.json();
      if (!dJson.success) throw new Error(dJson.error || 'Schedule not found');
      if (!aJson.success) throw new Error(aJson.error || 'Attendance failed');
      const det = dJson.data as ScheduleDetail;
      setDetail(det);
      setRows(aJson.data as ScheduleAttendance[]);

      const start = startOfDay(new Date(det.Start_Date));
      const end = startOfDay(new Date(det.End_Date));
      const today = startOfDay(new Date());
      if (isWithinInterval(today, { start, end })) {
        setSelected(today);
      } else {
        setSelected(start);
      }
    } catch (e) {
      console.error(e);
      toast({
        title: e instanceof Error ? e.message : 'Load failed',
        variant: 'destructive',
      });
      router.push('/schedules');
    } finally {
      setLoading(false);
    }
  }, [scheduleId, router, toast]);

  useEffect(() => {
    if (!Number.isFinite(scheduleId)) return;
    loadAll();
  }, [scheduleId, loadAll]);

  const handleFinalize = () => {
    setConfirmFinalizeOpen(true);
  };

  const finalizeSchedule = async () => {
    setConfirmFinalizeOpen(false);
    setFinalizing(true);
    try {
      const res = await fetch(`/api/schedules/${scheduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to finalize');
      toast({ title: 'Schedule finalized and activated' });
      loadAll();
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Failed to finalize',
        variant: 'destructive',
      });
    } finally {
      setFinalizing(false);
    }
  };

  const handleComplete = async () => {
    // Check for unmarked employees across the entire schedule FIRST
    const unmarkedRows = rows.filter((r) => r.Status === null || r.Status === undefined);
    
    console.log('[handleComplete] Debug info:', {
      totalRows: rows.length,
      unmarkedCount: unmarkedRows.length,
      pendingCount,
      sampleStatuses: rows.slice(0, 5).map(r => ({ empId: r.Employee_ID, status: r.Status }))
    });

    // Block if there are unsaved local changes
    if (pendingCount > 0) {
      toast({
        title: 'Save your changes first',
        description: `You have ${pendingCount} unsaved change${pendingCount === 1 ? '' : 's'}. Tap "Save" before marking the schedule as completed.`,
        variant: 'destructive',
      });
      return;
    }

    if (unmarkedRows.length > 0) {
      // Group unmarked rows by date
      const byDate = new Map<string, number>();
      for (const row of unmarkedRows) {
        const dateKey = format(new Date(row.Work_Date), 'yyyy-MM-dd');
        byDate.set(dateKey, (byDate.get(dateKey) || 0) + 1);
      }

      // Sort by date and format as "Day: X unmarked"
      const sortedDates = Array.from(byDate.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dateStr, count]) => {
          const date = new Date(dateStr);
          return `${format(date, 'EEE, MMM d')}: ${count} unmarked`;
        });

      const daysList = sortedDates.join('\n');
      setUnmarkedMessage(
        `There are ${unmarkedRows.length} unmarked attendance slot${unmarkedRows.length === 1 ? '' : 's'} across ${byDate.size} day${byDate.size === 1 ? '' : 's'}:\n\n${daysList}`
      );
      setConfirmCompleteOpen(true);
      return;
    }

    // No unmarked rows, proceed directly
    await completeSchedule();
  };

  const completeSchedule = async () => {
    setConfirmCompleteOpen(false);

    setFinalizing(true);
    try {
      const res = await fetch(`/api/schedules/${scheduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', force: true }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to mark as completed');
      toast({ title: 'Schedule marked as completed' });
      loadAll();
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Failed to complete schedule',
        variant: 'destructive',
      });
    } finally {
      setFinalizing(false);
    }
  };

  // ---------- Sync pending marks to server ----------

  const handleSync = async () => {
    if (pendingCount === 0) return;
    setSyncing(true);
    try {
      const res = await fetch(`/api/schedules/${scheduleId}/attendance/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marks: pendingMarksArray.map((m) => ({
            employeeId: m.employeeId,
            workDate: m.workDate,
            status: m.status,
            overtimeHours: m.overtimeHours ?? 0,
            isPublicHoliday: m.isPublicHoliday ?? false,
            isSickLeave: m.isSickLeave ?? false,
            absenceReason: m.absenceReason ?? null,
          })),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Sync failed');
      clearAll();
      await loadAll();
      toast({ title: `${pendingMarksArray.length} change${pendingMarksArray.length === 1 ? '' : 's'} saved` });
    } catch (e) {
      toast({
        title: e instanceof Error ? e.message : 'Sync failed',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const start = detail ? startOfDay(new Date(detail.Start_Date)) : new Date();
  const end = detail ? startOfDay(new Date(detail.End_Date)) : new Date();

  const selectedDateStr = format(selected, 'yyyy-MM-dd');

  const rowsForDay = useMemo(() => {
    return rows.filter((r) => isSameDay(new Date(r.Work_Date), selected));
  }, [rows, selected]);

  // Build a map that merges server rows with any pending overrides for display
  const byEmployee = useMemo(() => {
    const m = new Map<number, ScheduleAttendance>();
    for (const r of rowsForDay) {
      const pendingMark = getPendingMark(r.Employee_ID, selectedDateStr);
      if (pendingMark) {
        // Create a synthetic row reflecting the pending state
        const effectiveStatus =
          pendingMark.status === 'unmarked' ? null : pendingMark.status;
        m.set(r.Employee_ID, {
          ...r,
          Status: effectiveStatus,
          Hours_Worked: effectiveStatus && effectiveStatus !== 'absent' ? r.Hours_Worked : null,
          Overtime_Hours: pendingMark.overtimeHours ?? null,
          Absence_Reason: pendingMark.absenceReason ?? null,
        });
      } else {
        m.set(r.Employee_ID, r);
      }
    }
    return m;
  }, [rowsForDay, getPendingMark, selectedDateStr]);

  const pendingForDay = useMemo(
    () => getPendingForDay(selectedDateStr),
    [getPendingForDay, selectedDateStr]
  );

  const isDayComplete = useCallback(
    (d: Date) => {
      if (!detail?.employees.length) return false;
      const dayStr = format(d, 'yyyy-MM-dd');
      for (const e of detail.employees) {
        const eff = getEffectiveStatus(
          e.Employee_ID,
          dayStr,
          rows.find(
            (r) => r.Employee_ID === e.Employee_ID && isSameDay(new Date(r.Work_Date), d)
          )
        );
        if (!eff || eff === 'unmarked') return false;
      }
      return true;
    },
    [detail, rows, getEffectiveStatus]
  );

  const summary = useMemo(() => {
    let presentLike = 0;
    let absent = 0;
    let unmarked = 0;
    for (const e of detail?.employees ?? []) {
      const row = byEmployee.get(e.Employee_ID);
      const s = row?.Status;
      if (!s) unmarked++;
      else if (s === 'absent') absent++;
      else presentLike++;
    }
    return { presentLike, absent, unmarked, total: detail?.employees.length ?? 0 };
  }, [byEmployee, detail?.employees]);

  const availableEmployees = useMemo(() => {
    const rosterIds = new Set(detail?.employees.map(e => e.Employee_ID) ?? []);
    const q = employeeSearch.trim().toLowerCase();
    
    let filtered = allEmployees.filter(e => !rosterIds.has(e.ID));
    
    if (q) {
      filtered = filtered.filter((e) => {
        const searchText = [
          e.EmplNo,
          e.FirstName,
          e.LastName,
          e.knownAs,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return searchText.includes(q);
      });
    }
    
    return filtered.slice(0, 20);
  }, [allEmployees, detail?.employees, employeeSearch]);

  // ---------- Card tap → local pending ----------

  const isEditable = detail?.Status === 'active';

  const onCardTap = (emp: ScheduleEmployeeWithEmployee) => {
    if (!isEditable) {
      toast({ title: 'Finalize the schedule before marking attendance', variant: 'destructive' });
      return;
    }
    const wd = selectedDateStr;
    const effectiveNow = getEffectiveStatus(
      emp.Employee_ID,
      wd,
      rowsForDay.find((r) => r.Employee_ID === emp.Employee_ID)
    );
    const current = effectiveNow === 'unmarked' ? null : effectiveNow;
    const next = nextCycleStatus(current);

    if (next === 'present') {
      setPendingMark({
        employeeId: emp.Employee_ID,
        workDate: wd,
        status: 'present',
        overtimeHours: 0,
        isPublicHoliday: false,
        isSickLeave: false,
      });
    } else if (next === 'absent') {
      // Show dialog to capture absence reason
      setAbsenceEmployee(emp);
      const row = byEmployee.get(emp.Employee_ID);
      setAbsenceReason(row?.Absence_Reason ?? '');
      setAbsenceDialogOpen(true);
    } else {
      setPendingMark({
        employeeId: emp.Employee_ID,
        workDate: wd,
        status: 'unmarked',
      });
    }
  };

  const saveAbsence = () => {
    if (!absenceEmployee) return;
    setPendingMark({
      employeeId: absenceEmployee.Employee_ID,
      workDate: selectedDateStr,
      status: 'absent',
      absenceReason: absenceReason.trim() || null,
    });
    setAbsenceDialogOpen(false);
    setAbsenceEmployee(null);
    setAbsenceReason('');
  };

  const openAddEmployee = async () => {
    // Fetch all employees if not already loaded
    if (allEmployees.length === 0) {
      try {
        const res = await fetch('/api/employees');
        const data = await res.json();
        setAllEmployees(data);
      } catch (e) {
        toast({
          title: 'Failed to load employees',
          variant: 'destructive',
        });
        return;
      }
    }
    setEmployeeSearch('');
    setSelectedEmployeeId(null);
    setDateRangeOption('remaining');
    setAddEmployeeOpen(true);
  };

  const handleAddEmployee = async () => {
    if (!selectedEmployeeId) {
      toast({
        title: 'Please select an employee',
        variant: 'destructive',
      });
      return;
    }

    setAddingEmployee(true);
    try {
      const res = await fetch(`/api/schedules/${scheduleId}/add-employee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          startDate: selectedDateStr,
          endDateOption: dateRangeOption,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to add employee');
      
      toast({ title: 'Employee added to schedule' });
      setAddEmployeeOpen(false);
      await loadAll();

      // Auto-mark them present for the selected day
      setPendingMark({
        employeeId: selectedEmployeeId,
        workDate: selectedDateStr,
        status: 'present',
        overtimeHours: 0,
        isPublicHoliday: false,
        isSickLeave: false,
      });
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Failed to add employee',
        variant: 'destructive',
      });
    } finally {
      setAddingEmployee(false);
    }
  };

  const openEdit = (emp: ScheduleEmployeeWithEmployee) => {
    if (!isEditable) {
      toast({ title: 'Finalize the schedule before marking attendance', variant: 'destructive' });
      return;
    }
    const row = byEmployee.get(emp.Employee_ID) ?? null;
    setEditEmployee(emp);
    setEditAttendance(row);
    setOvertimeInput(String(row?.Overtime_Hours ?? 0));
    setPh(row?.Status === 'public_holiday');
    setSick(row?.Status === 'sick_leave');
    setAbsenceReason(row?.Absence_Reason ?? '');
    setEditOpen(true);
  };

  const saveEdit = () => {
    if (!editEmployee) return;
    const wd = selectedDateStr;
    const ot = parseFloat(overtimeInput) || 0;

    setPendingMark({
      employeeId: editEmployee.Employee_ID,
      workDate: wd,
      status: ph
        ? 'public_holiday'
        : sick
          ? 'sick_leave'
          : ot > 0
            ? 'overtime'
            : 'present',
      overtimeHours: ot,
      isPublicHoliday: ph,
      isSickLeave: sick,
      absenceReason: null,
    });

    setEditOpen(false);
    toast({ title: 'Marked locally — tap Save to sync' });
  };

  if (loading || !detail) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const name = (e: ScheduleEmployeeWithEmployee) =>
    e.knownAs ||
    [e.FirstName, e.LastName].filter(Boolean).join(' ') ||
    'Unknown';

  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/schedules">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Schedules
          </Link>
        </Button>
        <div className="flex gap-2">
          {detail.Status === 'draft' && (
            <Button
              size="sm"
              onClick={handleFinalize}
              disabled={finalizing}
            >
              {finalizing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Finalize Schedule
            </Button>
          )}
          {detail.Status === 'active' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleComplete}
              disabled={finalizing}
            >
              {finalizing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Mark as Completed
            </Button>
          )}
        </div>
        {detail.Status === 'draft' && (
          <p className="w-full text-sm text-amber-600">
            ⚠️ This schedule is in draft mode. Finalize it before marking attendance.
          </p>
        )}
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Attendance</h1>
        <p className="text-muted-foreground">
          {detail.GrowerName} · {format(start, 'MMM d')} — {format(end, 'MMM d, yyyy')}
          {detail.Status !== 'draft' && (
            <span className="ml-2 inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
              {detail.Status}
            </span>
          )}
        </p>
      </div>

      <DayNavigator
        start={start}
        end={end}
        selected={selected}
        onSelect={setSelected}
        isDayComplete={isDayComplete}
      />

      {isEditable && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={openAddEmployee}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Employee to This Day
          </Button>
        </div>
      )}

      <AttendanceGrid
        employees={detail.employees}
        byEmployee={byEmployee}
        saving={false}
        onCardTap={onCardTap}
        onEdit={openEdit}
        pendingEmployeeIds={pendingForDay}
      />

      {/* Sticky bottom bar: summary + save button */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background/95 px-4 py-3 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span>
            <strong className="text-foreground">{summary.presentLike}</strong> worked / leave
          </span>
          <span>
            <strong className="text-foreground">{summary.absent}</strong> absent
          </span>
          <span>
            <strong className="text-foreground">{summary.unmarked}</strong> not marked
          </span>
          <span className="text-muted-foreground">· {summary.total} rostered</span>

          {pendingCount > 0 && (
            <Button
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              className="ml-2"
            >
              {syncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Save {pendingCount} change{pendingCount === 1 ? '' : 's'}
            </Button>
          )}
        </div>
      </div>

      <Dialog open={addEmployeeOpen} onOpenChange={setAddEmployeeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Employee to Schedule</DialogTitle>
            <DialogDescription>
              Add an employee to the schedule starting from {format(selected, 'EEEE, MMM d')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Date range</Label>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input
                    type="radio"
                    value="single"
                    checked={dateRangeOption === 'single'}
                    onChange={() => setDateRangeOption('single')}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">
                    <strong>This day only</strong> — {format(selected, 'MMM d')}
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input
                    type="radio"
                    value="remaining"
                    checked={dateRangeOption === 'remaining'}
                    onChange={() => setDateRangeOption('remaining')}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">
                    <strong>This day and all remaining days</strong> — {format(selected, 'MMM d')} to {format(end, 'MMM d')}
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emp-search">Search for employee</Label>
              <Input
                id="emp-search"
                placeholder="Search by number or name..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                autoFocus
              />
            </div>

            {employeeSearch.trim() && (
              <div className="max-h-[300px] space-y-1 overflow-y-auto rounded-md border p-2">
                {availableEmployees.length === 0 && (
                  <p className="p-2 text-sm text-muted-foreground">
                    No available employees found.
                  </p>
                )}
                {availableEmployees.map((emp) => (
                  <button
                    key={emp.ID}
                    type="button"
                    onClick={() => setSelectedEmployeeId(emp.ID)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      selectedEmployeeId === emp.ID
                        ? 'border-primary bg-primary/10'
                        : 'border-transparent hover:bg-muted/60'
                    }`}
                  >
                    <span className="font-mono text-xs text-muted-foreground">
                      {emp.EmplNo}
                    </span>
                    {' — '}
                    <span className="font-medium">
                      {emp.knownAs || [emp.FirstName, emp.LastName].filter(Boolean).join(' ')}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {selectedEmployeeId && (
              <p className="text-sm text-muted-foreground">
                Selected: {allEmployees.find(e => e.ID === selectedEmployeeId)?.EmplNo}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddEmployeeOpen(false)}
              disabled={addingEmployee}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddEmployee}
              disabled={!selectedEmployeeId || addingEmployee}
            >
              {addingEmployee ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Add Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={absenceDialogOpen} onOpenChange={setAbsenceDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Mark as Absent
            </DialogTitle>
            <DialogDescription>
              {absenceEmployee ? `${absenceEmployee.EmplNo} — ${name(absenceEmployee)}` : ''} · {format(selected, 'EEEE, MMM d')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Absence reason (optional)</Label>
              <Input
                value={absenceReason}
                onChange={(e) => setAbsenceReason(e.target.value)}
                placeholder="e.g., Sick, Family emergency, etc."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    saveAbsence();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setAbsenceDialogOpen(false);
                setAbsenceEmployee(null);
                setAbsenceReason('');
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={saveAbsence}>
              Mark as Absent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editEmployee ? `${editEmployee.EmplNo} — ${name(editEmployee)}` : 'Edit'}
            </DialogTitle>
            <DialogDescription>
              {format(selected, 'EEEE, MMM d')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={ph}
                  onChange={(e) => {
                    setPh(e.target.checked);
                    if (e.target.checked) setSick(false);
                  }}
                  className="h-4 w-4 rounded border"
                />
                Public holiday (hours to PH column)
              </label>
            </div>
            <div className="flex gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={sick}
                  onChange={(e) => {
                    setSick(e.target.checked);
                    if (e.target.checked) setPh(false);
                  }}
                  className="h-4 w-4 rounded border"
                />
                Sick leave
              </label>
            </div>
            <div className="space-y-2">
              <Label>Overtime hours</Label>
              <Input
                type="number"
                min={0}
                max={24}
                step={0.5}
                value={overtimeInput}
                onChange={(e) => setOvertimeInput(e.target.value)}
                disabled={ph || sick}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveEdit}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmFinalizeOpen} onOpenChange={setConfirmFinalizeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finalize Schedule</DialogTitle>
            <DialogDescription>
              Finalize this schedule? Once finalized, you can mark attendance but cannot delete the schedule.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setConfirmFinalizeOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={finalizeSchedule} disabled={finalizing}>
              {finalizing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Finalize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmCompleteOpen} onOpenChange={setConfirmCompleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unmarked Attendance</DialogTitle>
            <DialogDescription className="whitespace-pre-line">
              {unmarkedMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm font-medium">
              Do you want to mark this schedule as completed anyway?
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setConfirmCompleteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={completeSchedule} disabled={finalizing}>
              {finalizing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Mark as Completed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
