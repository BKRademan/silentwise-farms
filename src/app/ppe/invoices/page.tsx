'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Edit2, FileText, Plus, RefreshCw, Trash2, Wallet } from 'lucide-react';
import { DateRangeFields } from '@/components/filters/date-range-fields';
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
import { toDateOnlyFromDateParts } from '@/lib/date-time/south-africa';
import { formatCurrency, formatDisplayDate } from '@/lib/format';
import { sumMoney } from '@/lib/money';
import type { PPEInvoiceSummary, PPESupplierWithUsage } from '@/types/database';

export default function PPEInvoicesPage() {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<Date>(() => getFinancialYearStart(new Date()));
  const [endDate, setEndDate] = useState<Date>(() => new Date());
  const [supplierId, setSupplierId] = useState('');
  const [deleting, setDeleting] = useState<PPEInvoiceSummary | undefined>();
  const { data: suppliers } = useApiData<PPESupplierWithUsage[]>('/api/ppe/suppliers', []);

  const url = useMemo(() => {
    if (startDate > endDate) return null;
    const params = new URLSearchParams({
      startDate: toDateOnlyFromDateParts(startDate),
      endDate: toDateOnlyFromDateParts(endDate),
    });
    if (supplierId) params.set('supplierId', supplierId);
    return `/api/ppe/invoices?${params}`;
  }, [startDate, endDate, supplierId]);
  const { data: invoices, isLoading, error, reload } = useApiData<PPEInvoiceSummary[]>(url, []);

  const supplierOptions = useMemo(
    () => suppliers.map((s) => ({ value: String(s.ID), label: s.Supplier_Name })),
    [suppliers]
  );
  const total = useMemo(() => sumMoney(invoices.map((invoice) => invoice.Total_Excl_VAT)), [invoices]);

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await apiRequest(`/api/ppe/invoices?id=${deleting.ID}`, { method: 'DELETE' });
      toast({ title: 'Invoice deleted' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not delete invoice', description: (err as Error).message });
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
            <Button asChild size="sm" className="h-8 px-2 sm:h-10 sm:px-4">
              <Link href="/ppe/invoices/new">
                <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                Capture Invoice
              </Link>
            </Button>
          </div>
        </div>

        <PPENav />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <StatCard label="Invoices" value={invoices.length} icon={FileText} accent="text-green-600" />
          <StatCard label="Total excl VAT" value={formatCurrency(total)} icon={Wallet} accent="text-green-600" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4 sm:mb-6">
          <DateRangeFields
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
          <Combobox options={supplierOptions} value={supplierId} onValueChange={setSupplierId} placeholder="All suppliers" />
        </div>

        {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <Card className="bg-white shadow-md">
            <CardContent className="p-0">
              {invoices.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No supplier invoices for this period.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Invoice No</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Lines</TableHead>
                      <TableHead className="text-right">Total excl VAT</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.ID}>
                        <TableCell className="py-1.5 whitespace-nowrap">{formatDisplayDate(invoice.Invoice_Date)}</TableCell>
                        <TableCell className="py-1.5">{invoice.Supplier_Name}</TableCell>
                        <TableCell className="py-1.5">{invoice.Invoice_No}</TableCell>
                        <TableCell className="py-1.5 text-right hidden sm:table-cell">{invoice.LineCount}</TableCell>
                        <TableCell className="py-1.5 text-right font-medium">{formatCurrency(invoice.Total_Excl_VAT)}</TableCell>
                        <TableCell className="py-1.5 text-right">
                          <div className="flex justify-end gap-1">
                            <Button asChild variant="ghost" size="icon" className="h-7 w-7" title="Edit">
                              <Link href={`/ppe/invoices/${invoice.ID}`}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Delete"
                              onClick={() => setDeleting(invoice)}
                            >
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

        <ConfirmDeleteDialog
          open={Boolean(deleting)}
          onOpenChange={(open) => !open && setDeleting(undefined)}
          description={
            <>
              This will delete invoice {deleting?.Invoice_No} from {deleting?.Supplier_Name} and all {deleting?.LineCount}{' '}
              of its lines.
            </>
          }
          onConfirm={confirmDelete}
        />
      </div>
    </div>
  );
}
