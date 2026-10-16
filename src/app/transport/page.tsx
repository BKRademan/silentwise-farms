'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { subDays } from 'date-fns';
import { Building2, CalendarDays, Edit2, Plus, RefreshCw, Trash2, UserCog, Wallet } from 'lucide-react';
import { DateRangeFields } from '@/components/filters/date-range-fields';
import { TransportFormDialog } from '@/components/transport/transport-form-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { apiRequest } from '@/lib/api-client';
import { useData } from '@/lib/contexts/data-context';
import { toDateOnlyFromDateParts } from '@/lib/date-time/south-africa';
import { formatCurrency, formatDisplayDate } from '@/lib/format';
import type { TransportDriverWithUsage, TransportRecord } from '@/types/database';

export default function TransportPage() {
  const { growers } = useData();
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<Date>(() => subDays(new Date(), 60));
  const [endDate, setEndDate] = useState<Date>(() => new Date());
  const [growerId, setGrowerId] = useState('');
  const [records, setRecords] = useState<TransportRecord[]>([]);
  const [drivers, setDrivers] = useState<TransportDriverWithUsage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TransportRecord | undefined>();
  const [deleting, setDeleting] = useState<TransportRecord | undefined>();

  const loadRecords = useCallback(async () => {
    if (startDate > endDate) {
      setRecords([]);
      return;
    }
    const params = new URLSearchParams({
      startDate: toDateOnlyFromDateParts(startDate),
      endDate: toDateOnlyFromDateParts(endDate),
    });
    if (growerId) params.set('growerId', growerId);

    setIsLoading(true);
    setError(null);
    try {
      setRecords(await apiRequest<TransportRecord[]>(`/api/transport?${params}`));
    } catch (err) {
      setError((err as Error).message);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, growerId]);

  const loadDrivers = useCallback(async () => {
    try {
      setDrivers(await apiRequest<TransportDriverWithUsage[]>('/api/transport/drivers?all=1'));
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not load drivers', description: (err as Error).message });
    }
  }, [toast]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  const growerOptions = useMemo(
    () => growers.map((g) => ({ value: String(g.ID), label: g.GrowerName || 'Unnamed Grower' })),
    [growers]
  );

  const totals = useMemo(
    () => ({
      days: records.reduce((sum, r) => sum + (r.Days || 0), 0),
      value: records.reduce((sum, r) => sum + (r.Days || 0) * (r.RatePerDay || 0), 0),
      growers: new Set(records.map((r) => r.Grower_ID_FK)).size,
    }),
    [records]
  );

  function openCreate() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(record: TransportRecord) {
    setEditing(record);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await apiRequest(`/api/transport?id=${deleting.ID}`, { method: 'DELETE' });
      toast({ title: 'Transport deleted' });
      loadRecords();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not delete transport', description: (err as Error).message });
    } finally {
      setDeleting(undefined);
    }
  }

  return (
    <div className="min-w-[250px] w-full">
      <div className="px-4 sm:px-6 lg:px-8 py-2 sm:py-6 w-full bg-gray-50/90">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Transport</h1>
          <div className="flex items-center gap-2">
            <Button onClick={loadRecords} disabled={isLoading} size="sm" variant="outline" className="h-8 px-2 sm:h-10 sm:px-4">
              <RefreshCw className="h-4 w-4 mr-1 sm:mr-2" />
              Refresh
            </Button>
            <Button asChild size="sm" variant="outline" className="h-8 px-2 sm:h-10 sm:px-4">
              <Link href="/transport/drivers">
                <UserCog className="h-4 w-4 mr-1 sm:mr-2" />
                Manage Drivers
              </Link>
            </Button>
            <Button onClick={openCreate} size="sm" className="h-8 px-2 sm:h-10 sm:px-4">
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              Capture Transport
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <StatCard label="Days" value={totals.days} icon={CalendarDays} accent="text-orange-600" />
          <StatCard label="Transport Value" value={formatCurrency(totals.value)} icon={Wallet} accent="text-orange-600" />
          <StatCard label="Growers" value={totals.growers} icon={Building2} accent="text-orange-600" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4 sm:mb-6">
          <DateRangeFields
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
          <Combobox options={growerOptions} value={growerId} onValueChange={setGrowerId} placeholder="All growers" />
        </div>

        {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <Card className="bg-white shadow-md">
            <CardContent className="p-0">
              {records.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No transport captured for this period.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Grower</TableHead>
                      <TableHead className="text-right">Days</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Rate / Day</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="hidden md:table-cell">Driver</TableHead>
                      <TableHead className="hidden lg:table-cell">Comment</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.ID}>
                        <TableCell className="py-1.5 whitespace-nowrap">{formatDisplayDate(record.Date)}</TableCell>
                        <TableCell className="py-1.5">{record.GrowerName || '-'}</TableCell>
                        <TableCell className="py-1.5 text-right">{record.Days}</TableCell>
                        <TableCell className="py-1.5 text-right hidden sm:table-cell">{formatCurrency(record.RatePerDay)}</TableCell>
                        <TableCell className="py-1.5 text-right font-medium">
                          {formatCurrency((record.Days || 0) * (record.RatePerDay || 0))}
                        </TableCell>
                        <TableCell className="py-1.5 hidden md:table-cell">{record.Driver || '-'}</TableCell>
                        <TableCell className="py-1.5 hidden lg:table-cell max-w-[240px] truncate" title={record.Comment ?? undefined}>
                          {record.Comment || '-'}
                        </TableCell>
                        <TableCell className="py-1.5 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(record)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleting(record)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        <TransportFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          record={editing}
          drivers={drivers}
          onSaved={() => {
            loadRecords();
            loadDrivers();
          }}
        />

        <ConfirmDeleteDialog
          open={Boolean(deleting)}
          onOpenChange={(open) => !open && setDeleting(undefined)}
          description={
            <>
              This will delete the transport for {deleting?.GrowerName} on {formatDisplayDate(deleting?.Date)}.
            </>
          }
          onConfirm={confirmDelete}
        />
      </div>
    </div>
  );
}
