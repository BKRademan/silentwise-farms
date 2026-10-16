'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { subDays } from 'date-fns';
import { Edit2, Package, Plus, RefreshCw, Trash2, Users, Wallet } from 'lucide-react';
import { DateRangeFields } from '@/components/filters/date-range-fields';
import { PPEIssueFormDialog } from '@/components/ppe/ppe-issue-form-dialog';
import { PPENav } from '@/components/ppe/ppe-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { usePPEItems } from '@/hooks/use-ppe-items';
import { apiRequest } from '@/lib/api-client';
import { useData } from '@/lib/contexts/data-context';
import { toDateOnlyFromDateParts } from '@/lib/date-time/south-africa';
import { formatCurrency, formatDisplayDate } from '@/lib/format';
import type { PPEIssue } from '@/types/database';

export default function PPEIssuesPage() {
  const { employees } = useData();
  const { items, reload: reloadItems } = usePPEItems();
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<Date>(() => subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(() => new Date());
  const [employeeId, setEmployeeId] = useState('');
  const [itemId, setItemId] = useState('');
  const [issues, setIssues] = useState<PPEIssue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PPEIssue | undefined>();
  const [deleting, setDeleting] = useState<PPEIssue | undefined>();

  const loadIssues = useCallback(async () => {
    if (startDate > endDate) {
      setIssues([]);
      return;
    }
    const params = new URLSearchParams({
      startDate: toDateOnlyFromDateParts(startDate),
      endDate: toDateOnlyFromDateParts(endDate),
    });
    if (employeeId) params.set('employeeId', employeeId);
    if (itemId) params.set('ppeItemId', itemId);

    setIsLoading(true);
    setError(null);
    try {
      setIssues(await apiRequest<PPEIssue[]>(`/api/ppe/issues?${params}`));
    } catch (err) {
      setError((err as Error).message);
      setIssues([]);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, employeeId, itemId]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  const employeeOptions = useMemo(
    () => employees.map((e) => ({ value: String(e.ID), label: e.EmplNo || 'Unnamed Employee' })),
    [employees]
  );
  const itemOptions = useMemo(
    () => items.map((i) => ({ value: String(i.ID), label: i.PPE_Item || 'Unnamed item' })),
    [items]
  );

  const totals = useMemo(
    () => ({
      count: issues.length,
      amount: issues.reduce((sum, i) => sum + (i.Amount || 0), 0),
      employees: new Set(issues.map((i) => i.EmployeeID)).size,
    }),
    [issues]
  );

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await apiRequest(`/api/ppe/issues?id=${deleting.ID}`, { method: 'DELETE' });
      toast({ title: 'PPE issue deleted' });
      loadIssues();
      reloadItems();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not delete PPE issue', description: (err as Error).message });
    } finally {
      setDeleting(undefined);
    }
  }

  return (
    <div className="min-w-[250px] w-full">
      <div className="px-4 sm:px-6 lg:px-8 py-2 sm:py-6 w-full bg-gray-50/90">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4">
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight">PPE</h1>
          <div className="flex items-center gap-2">
            <Button onClick={loadIssues} disabled={isLoading} size="sm" variant="outline" className="h-8 px-2 sm:h-10 sm:px-4">
              <RefreshCw className="h-4 w-4 mr-1 sm:mr-2" />
              Refresh
            </Button>
            <Button
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
              size="sm"
              className="h-8 px-2 sm:h-10 sm:px-4"
            >
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              Issue PPE
            </Button>
          </div>
        </div>

        <PPENav />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <StatCard label="Items Issued" value={totals.count} icon={Package} accent="text-green-600" />
          <StatCard label="Deducted" value={formatCurrency(totals.amount)} icon={Wallet} accent="text-green-600" />
          <StatCard label="Employees" value={totals.employees} icon={Users} accent="text-green-600" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4 sm:mb-6">
          <DateRangeFields
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
          <Combobox options={itemOptions} value={itemId} onValueChange={setItemId} placeholder="All items" />
          <Combobox options={employeeOptions} value={employeeId} onValueChange={setEmployeeId} placeholder="All employees" />
        </div>

        {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <Card className="bg-white shadow-md">
            <CardContent className="p-0">
              {issues.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No PPE issued for this period.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issues.map((issue) => (
                      <TableRow key={issue.ID}>
                        <TableCell className="py-1.5 whitespace-nowrap">{formatDisplayDate(issue.Date)}</TableCell>
                        <TableCell className="py-1.5">
                          {issue.Employee || <span className="text-amber-700">Unknown employee</span>}
                        </TableCell>
                        <TableCell className="py-1.5">{issue.PPE_Item || '-'}</TableCell>
                        <TableCell className="py-1.5 text-right font-medium">{formatCurrency(issue.Amount)}</TableCell>
                        <TableCell className="py-1.5 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditing(issue);
                                setFormOpen(true);
                              }}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleting(issue)}>
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

        <PPEIssueFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          issue={editing}
          items={items}
          onSaved={() => {
            loadIssues();
            reloadItems();
          }}
        />

        <ConfirmDeleteDialog
          open={Boolean(deleting)}
          onOpenChange={(open) => !open && setDeleting(undefined)}
          description={
            <>
              This will delete the {deleting?.PPE_Item} issued to {deleting?.Employee ?? 'this employee'} on{' '}
              {formatDisplayDate(deleting?.Date)}.
            </>
          }
          onConfirm={confirmDelete}
        />
      </div>
    </div>
  );
}
