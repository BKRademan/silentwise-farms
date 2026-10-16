'use client';

import { useState } from 'react';
import { Edit2, Plus, RefreshCw, SlidersHorizontal, Trash2 } from 'lucide-react';
import { PPENav } from '@/components/ppe/ppe-nav';
import { StockAdjustmentFormDialog } from '@/components/ppe/stock-adjustment-form-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { useApiData } from '@/hooks/use-api-data';
import { usePPEItems } from '@/hooks/use-ppe-items';
import { apiRequest } from '@/lib/api-client';
import { PPE_STOCK_TRACKING_START, STOCK_ADJUSTMENT_REASONS } from '@/lib/constants/ppe';
import { formatDisplayDate, formatQuantity } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PPEStockAdjustment, PPEStockLevel } from '@/types/database';

export default function PPEStockPage() {
  const { toast } = useToast();
  const { items, reload: reloadItems } = usePPEItems();
  const stock = useApiData<PPEStockLevel[]>('/api/ppe/stock', []);
  const adjustments = useApiData<PPEStockAdjustment[]>('/api/ppe/stock/adjustments', []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PPEStockAdjustment | undefined>();
  const [defaultItemId, setDefaultItemId] = useState<number | undefined>();
  const [deleting, setDeleting] = useState<PPEStockAdjustment | undefined>();

  function reloadAll() {
    stock.reload();
    adjustments.reload();
    reloadItems();
  }

  function openCreate(itemId?: number) {
    setEditing(undefined);
    setDefaultItemId(itemId);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await apiRequest(`/api/ppe/stock/adjustments?id=${deleting.ID}`, { method: 'DELETE' });
      toast({ title: 'Stock adjustment deleted' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not delete stock adjustment', description: (err as Error).message });
    } finally {
      setDeleting(undefined);
      reloadAll();
    }
  }

  return (
    <div className="min-w-[250px] w-full">
      <div className="px-4 sm:px-6 lg:px-8 py-2 sm:py-6 w-full bg-gray-50/90">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4">
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight">PPE</h1>
          <div className="flex items-center gap-2">
            <Button onClick={reloadAll} disabled={stock.isLoading} size="sm" variant="outline" className="h-8 px-2 sm:h-10 sm:px-4">
              <RefreshCw className="h-4 w-4 mr-1 sm:mr-2" />
              Refresh
            </Button>
            <Button onClick={() => openCreate()} size="sm" className="h-8 px-2 sm:h-10 sm:px-4">
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              Stock Adjustment
            </Button>
          </div>
        </div>

        <PPENav />

        <p className="mb-4 text-sm text-muted-foreground">
          Stock tracked from {formatDisplayDate(PPE_STOCK_TRACKING_START)}. On hand = adjustments + purchased (supplier
          invoice lines) − issued (one per PPE issue), counting only movements on or after that date.
        </p>

        {stock.error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{stock.error}</div>}

        {stock.isLoading ? (
          <LoadingSpinner />
        ) : (
          <Card className="bg-white shadow-md mb-6">
            <CardContent className="p-0">
              {stock.data.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No PPE items yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Adjustments</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Purchased</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Issued</TableHead>
                      <TableHead className="text-right">On Hand</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stock.data.map((row) => (
                      <TableRow key={row.ID}>
                        <TableCell className="py-1.5 font-medium">{row.PPE_Item || '-'}</TableCell>
                        <TableCell className="py-1.5 text-right hidden sm:table-cell">{formatQuantity(row.Adjustments)}</TableCell>
                        <TableCell className="py-1.5 text-right hidden sm:table-cell">{formatQuantity(row.Purchased)}</TableCell>
                        <TableCell className="py-1.5 text-right hidden sm:table-cell">{formatQuantity(row.Issued)}</TableCell>
                        <TableCell className={cn('py-1.5 text-right font-semibold', row.OnHand < 0 && 'text-red-600')}>
                          {formatQuantity(row.OnHand)}
                        </TableCell>
                        <TableCell className="py-1.5 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Adjust stock"
                            onClick={() => openCreate(row.ID)}
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="bg-white shadow-md">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Recent Stock Adjustments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {adjustments.error && <div className="m-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{adjustments.error}</div>}
            {adjustments.isLoading ? (
              <LoadingSpinner />
            ) : adjustments.data.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No stock adjustments yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="hidden sm:table-cell">Reason</TableHead>
                    <TableHead className="hidden lg:table-cell">Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustments.data.map((adjustment) => (
                    <TableRow key={adjustment.ID}>
                      <TableCell className="py-1.5 whitespace-nowrap">{formatDisplayDate(adjustment.Adjustment_Date)}</TableCell>
                      <TableCell className="py-1.5">{adjustment.PPE_Item || '-'}</TableCell>
                      <TableCell className={cn('py-1.5 text-right font-medium', adjustment.Quantity < 0 && 'text-red-600')}>
                        {adjustment.Quantity > 0 ? '+' : ''}
                        {formatQuantity(adjustment.Quantity)}
                      </TableCell>
                      <TableCell className="py-1.5 hidden sm:table-cell">
                        {STOCK_ADJUSTMENT_REASONS[adjustment.Reason as keyof typeof STOCK_ADJUSTMENT_REASONS] ?? adjustment.Reason}
                      </TableCell>
                      <TableCell className="py-1.5 hidden lg:table-cell max-w-[240px] truncate" title={adjustment.Notes ?? undefined}>
                        {adjustment.Notes || '-'}
                      </TableCell>
                      <TableCell className="py-1.5 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Edit"
                            onClick={() => {
                              setEditing(adjustment);
                              setDefaultItemId(undefined);
                              setFormOpen(true);
                            }}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Delete" onClick={() => setDeleting(adjustment)}>
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

        <StockAdjustmentFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          adjustment={editing}
          defaultItemId={defaultItemId}
          items={items}
          onSaved={reloadAll}
        />

        <ConfirmDeleteDialog
          open={Boolean(deleting)}
          onOpenChange={(open) => !open && setDeleting(undefined)}
          description={
            <>
              This will delete the {formatQuantity(deleting?.Quantity)} {deleting?.PPE_Item} adjustment dated{' '}
              {formatDisplayDate(deleting?.Adjustment_Date)}.
            </>
          }
          onConfirm={confirmDelete}
        />
      </div>
    </div>
  );
}
