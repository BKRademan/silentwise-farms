'use client';

import { useState } from 'react';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { PPEItemFormDialog } from '@/components/ppe/ppe-item-form-dialog';
import { PPENav } from '@/components/ppe/ppe-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { usePPEItems } from '@/hooks/use-ppe-items';
import { apiRequest } from '@/lib/api-client';
import { formatCurrency, formatDisplayDate } from '@/lib/format';
import type { PPEItemWithUsage } from '@/types/database';

export default function PPEItemsPage() {
  const { items, isLoading, error, reload } = usePPEItems();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PPEItemWithUsage | undefined>();
  const [deleting, setDeleting] = useState<PPEItemWithUsage | undefined>();

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await apiRequest(`/api/ppe/items?id=${deleting.ID}`, { method: 'DELETE' });
      toast({ title: 'PPE item deleted' });
      reload();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not delete PPE item', description: (err as Error).message });
    } finally {
      setDeleting(undefined);
    }
  }

  return (
    <div className="min-w-[250px] w-full">
      <div className="px-4 sm:px-6 lg:px-8 py-2 sm:py-6 w-full bg-gray-50/90">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4">
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight">PPE</h1>
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
            size="sm"
            className="h-8 px-2 sm:h-10 sm:px-4"
          >
            <Plus className="h-4 w-4 mr-1 sm:mr-2" />
            Add Item
          </Button>
        </div>

        <PPENav />

        {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <Card className="bg-white shadow-md">
            <CardContent className="p-0">
              {items.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No PPE items yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Deduction Price</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Times Issued</TableHead>
                      <TableHead className="hidden sm:table-cell">Last Issued</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.ID}>
                        <TableCell className="py-1.5 font-medium">{item.PPE_Item || '-'}</TableCell>
                        <TableCell className="py-1.5 text-right">{formatCurrency(item.PPE_Item_Value)}</TableCell>
                        <TableCell className="py-1.5 text-right hidden sm:table-cell">{item.IssueCount}</TableCell>
                        <TableCell className="py-1.5 hidden sm:table-cell">{formatDisplayDate(item.LastIssued)}</TableCell>
                        <TableCell className="py-1.5 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditing(item);
                                setFormOpen(true);
                              }}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={isItemInUse(item)}
                              title={
                                isItemInUse(item)
                                  ? 'Items that have been issued, purchased or stock-adjusted cannot be deleted'
                                  : undefined
                              }
                              onClick={() => setDeleting(item)}
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

        <PPEItemFormDialog open={formOpen} onOpenChange={setFormOpen} item={editing} onSaved={reload} />

        <ConfirmDeleteDialog
          open={Boolean(deleting)}
          onOpenChange={(open) => !open && setDeleting(undefined)}
          description={<>This will delete the PPE item &quot;{deleting?.PPE_Item}&quot;.</>}
          onConfirm={confirmDelete}
        />
      </div>
    </div>
  );
}

function isItemInUse(item: PPEItemWithUsage): boolean {
  return item.IssueCount + item.InvoiceLineCount + item.AdjustmentCount > 0;
}
