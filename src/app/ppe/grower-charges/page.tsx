'use client';

import { useMemo, useState } from 'react';
import { Building2, Edit2, Plus, Receipt, RefreshCw, Trash2, Wallet } from 'lucide-react';
import { DateRangeFields } from '@/components/filters/date-range-fields';
import { GrowerChargeFormDialog } from '@/components/ppe/grower-charge-form-dialog';
import { PPENav } from '@/components/ppe/ppe-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { StatCard } from '@/components/ui/stat-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { useApiData } from '@/hooks/use-api-data';
import { apiRequest } from '@/lib/api-client';
import { getFinancialYearStart } from '@/lib/constants/ppe';
import { useData } from '@/lib/contexts/data-context';
import { toDateOnlyFromDateParts } from '@/lib/date-time/south-africa';
import { formatCurrency, formatDisplayDate } from '@/lib/format';
import { sumMoney } from '@/lib/money';
import type { PPEGrowerCharge } from '@/types/database';

export default function PPEGrowerChargesPage() {
  const { growers } = useData();
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<Date>(() => getFinancialYearStart(new Date()));
  const [endDate, setEndDate] = useState<Date>(() => new Date());
  const [growerId, setGrowerId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PPEGrowerCharge | undefined>();
  const [deleting, setDeleting] = useState<PPEGrowerCharge | undefined>();

  const url = useMemo(() => {
    if (startDate > endDate) return null;
    const params = new URLSearchParams({
      startDate: toDateOnlyFromDateParts(startDate),
      endDate: toDateOnlyFromDateParts(endDate),
    });
    if (growerId) params.set('growerId', growerId);
    return `/api/ppe/grower-charges?${params}`;
  }, [startDate, endDate, growerId]);
  const { data: charges, isLoading, error, reload } = useApiData<PPEGrowerCharge[]>(url, []);

  const growerOptions = useMemo(
    () => growers.map((g) => ({ value: String(g.ID), label: g.GrowerName || 'Unnamed Grower' })),
    [growers]
  );
  const totals = useMemo(
    () => ({
      amount: sumMoney(charges.map((charge) => charge.Amount_Excl_VAT)),
      growers: new Set(charges.map((charge) => charge.Grower_ID)).size,
    }),
    [charges]
  );

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await apiRequest(`/api/ppe/grower-charges?id=${deleting.ID}`, { method: 'DELETE' });
      toast({ title: 'Grower charge deleted' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not delete grower charge', description: (err as Error).message });
    } finally {
      setDeleting(undefined);
      reload();
    }
  }

  return (
    <div className="min-w-[250px] w-full">
      <div className="px-4 sm:px-6 lg:px-8 py-2 sm:py-6 w-full bg-gray-50/90">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4">
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight">PPE</h1>
          <div className="flex items-center gap-2">
            <Button onClick={reload} disabled={isLoading} size="sm" variant="outline" className="h-8 px-2 sm:h-10 sm:px-4">
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
              Add Charge
            </Button>
          </div>
        </div>

        <PPENav />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <StatCard label="Charges" value={charges.length} icon={Receipt} accent="text-green-600" />
          <StatCard label="Charged excl VAT" value={formatCurrency(totals.amount)} icon={Wallet} accent="text-green-600" />
          <StatCard label="Growers" value={totals.growers} icon={Building2} accent="text-green-600" />
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
              {charges.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No grower charges for this period.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Grower</TableHead>
                      <TableHead className="hidden sm:table-cell">Reference</TableHead>
                      <TableHead className="text-right">Amount excl VAT</TableHead>
                      <TableHead className="hidden lg:table-cell">Notes</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {charges.map((charge) => (
                      <TableRow key={charge.ID}>
                        <TableCell className="py-1.5 whitespace-nowrap">{formatDisplayDate(charge.Charge_Date)}</TableCell>
                        <TableCell className="py-1.5">{charge.GrowerName || '-'}</TableCell>
                        <TableCell className="py-1.5 hidden sm:table-cell">{charge.Reference || '-'}</TableCell>
                        <TableCell className="py-1.5 text-right font-medium">{formatCurrency(charge.Amount_Excl_VAT)}</TableCell>
                        <TableCell className="py-1.5 hidden lg:table-cell max-w-[240px] truncate" title={charge.Notes ?? undefined}>
                          {charge.Notes || '-'}
                        </TableCell>
                        <TableCell className="py-1.5 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Edit"
                              onClick={() => {
                                setEditing(charge);
                                setFormOpen(true);
                              }}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Delete" onClick={() => setDeleting(charge)}>
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

        <GrowerChargeFormDialog open={formOpen} onOpenChange={setFormOpen} charge={editing} onSaved={reload} />

        <ConfirmDeleteDialog
          open={Boolean(deleting)}
          onOpenChange={(open) => !open && setDeleting(undefined)}
          description={
            <>
              This will delete the {formatCurrency(deleting?.Amount_Excl_VAT)} charge to {deleting?.GrowerName ?? 'this grower'} on{' '}
              {formatDisplayDate(deleting?.Charge_Date)}.
            </>
          }
          onConfirm={confirmDelete}
        />
      </div>
    </div>
  );
}
