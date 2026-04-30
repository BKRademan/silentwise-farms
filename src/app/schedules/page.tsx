'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useData } from '@/lib/contexts/data-context';
import { Combobox } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, CalendarRange, Trash2, CheckCircle2, Pencil, Undo2 } from 'lucide-react';
import type { ScheduleWithGrower } from '@/types/schedule';
import { useToast } from '@/components/ui/use-toast';
import { getPendingAttendanceCount } from '@/hooks/use-pending-attendance';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function SchedulesPage() {
  const { toast } = useToast();
  const { growers, isLoading: dataLoading } = useData();
  const [items, setItems] = useState<ScheduleWithGrower[]>([]);
  const [loading, setLoading] = useState(true);
  const [growerFilter, setGrowerFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<{ id: number; name: string | null } | null>(null);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [scheduleToComplete, setScheduleToComplete] = useState<{ id: number; name: string | null; message: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [completing, setCompleting] = useState(false);

  const growerOptions = [
    { value: '', label: 'All growers' },
    ...growers.map((g) => ({
      value: String(g.ID),
      label: g.GrowerName || `Grower ${g.ID}`,
    })),
  ];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (growerFilter) p.set('growerId', growerFilter);
      if (statusFilter) p.set('status', statusFilter);
      const res = await fetch(`/api/schedules?${p.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load');
      setItems(json.data as ScheduleWithGrower[]);
    } catch (e) {
      console.error(e);
      toast({ title: 'Failed to load schedules', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [growerFilter, statusFilter, toast]);

  useEffect(() => {
    if (!dataLoading) load();
  }, [dataLoading, load]);

  const handleDelete = (id: number, growerName: string | null) => {
    setScheduleToDelete({ id, name: growerName });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!scheduleToDelete) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`/api/schedules/${scheduleToDelete.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Delete failed');
      toast({ title: 'Schedule deleted' });
      setDeleteDialogOpen(false);
      setScheduleToDelete(null);
      load();
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Failed to delete schedule',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleComplete = async (id: number, growerName: string | null) => {
    try {
      // First attempt without force -- server rejects if unmarked slots exist
      const res = await fetch(`/api/schedules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      const json = await res.json();

      if (!json.success) {
        const errorMsg = json.error || 'Failed to mark as completed';
        if (errorMsg.includes('not yet marked')) {
          // Show dialog asking if they want to proceed anyway
          setScheduleToComplete({ id, name: growerName, message: errorMsg });
          setCompleteDialogOpen(true);
          return;
        } else {
          throw new Error(errorMsg);
        }
      }

      toast({ title: 'Schedule marked as completed' });
      load();
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Failed to complete schedule',
        variant: 'destructive',
      });
    }
  };

  const handleSetDraft = async (id: number) => {
    const pendingCount = getPendingAttendanceCount(id);
    if (pendingCount > 0) {
      toast({
        title: 'Unsaved attendance changes',
        description: `This schedule has ${pendingCount} unsaved attendance change${pendingCount === 1 ? '' : 's'} on this device. Open attendance to save or discard them before setting it back to draft.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const res = await fetch(`/api/schedules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to set schedule back to draft');

      toast({ title: 'Schedule set back to draft' });
      load();
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Failed to set schedule back to draft',
        variant: 'destructive',
      });
    }
  };

  const confirmComplete = async () => {
    if (!scheduleToComplete) return;
    
    setCompleting(true);
    try {
      const forceRes = await fetch(`/api/schedules/${scheduleToComplete.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', force: true }),
      });
      const forceJson = await forceRes.json();
      if (!forceJson.success) throw new Error(forceJson.error || 'Failed to mark as completed');
      
      toast({ title: 'Schedule marked as completed' });
      setCompleteDialogOpen(false);
      setScheduleToComplete(null);
      load();
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Failed to complete schedule',
        variant: 'destructive',
      });
    } finally {
      setCompleting(false);
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Schedules</h1>
          <p className="text-muted-foreground">
            Build weekly rosters by grower and capture attendance quickly on mobile.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/schedules/new">
            <Plus className="mr-2 h-5 w-5" />
            New schedule
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>Grower</Label>
          <Combobox
            options={growerOptions}
            value={growerFilter}
            onValueChange={(v) => setGrowerFilter(v)}
            placeholder="All growers"
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button variant="secondary" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
          </Button>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex justify-center py-12 text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No schedules yet. Create one to get started.
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((s) => (
            <li key={s.ID}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">
                      {s.GrowerName || `Grower #${s.Grower_ID}`}
                    </CardTitle>
                    <span
                      className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize"
                    >
                      {s.Status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarRange className="h-4 w-4 shrink-0" />
                    {format(new Date(s.Start_Date), 'MMM d')} —{' '}
                    {format(new Date(s.End_Date), 'MMM d, yyyy')}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2 pt-0">
                  <span className="text-sm text-muted-foreground">
                    {s.EmployeeCount} employee{s.EmployeeCount === 1 ? '' : 's'}
                  </span>
                  <Button asChild size="sm">
                    <Link href={`/schedules/${s.ID}/attendance`}>Attendance</Link>
                  </Button>
                  {s.Status === 'active' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetDraft(s.ID)}
                      >
                        <Undo2 className="mr-1 h-4 w-4" />
                        Draft
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleComplete(s.ID, s.GrowerName)}
                      >
                        <CheckCircle2 className="mr-1 h-4 w-4" />
                        Complete
                      </Button>
                    </>
                  )}
                  {s.Status === 'draft' && (
                    <>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/schedules/${s.ID}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(s.ID, s.GrowerName)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Schedule</DialogTitle>
            <DialogDescription>
              Delete schedule for {scheduleToDelete?.name || 'this grower'}? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unmarked Attendance</DialogTitle>
            <DialogDescription>
              {scheduleToComplete?.message}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm font-medium">
              Do you want to complete the schedule anyway?
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setCompleteDialogOpen(false)}
              disabled={completing}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={confirmComplete}
              disabled={completing}
            >
              {completing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Complete Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
