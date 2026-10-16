'use client';

import { useState } from 'react';
import { Edit2, Plus, Power, Trash2 } from 'lucide-react';
import { PPENav } from '@/components/ppe/ppe-nav';
import { SupplierFormDialog } from '@/components/ppe/supplier-form-dialog';
import { ActiveBadge } from '@/components/ui/active-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { useApiData } from '@/hooks/use-api-data';
import { apiRequest } from '@/lib/api-client';
import { formatDisplayDate } from '@/lib/format';
import type { SupplierInputBody } from '@/lib/validations/capture';
import type { PPESupplierWithUsage } from '@/types/database';

export default function PPESuppliersPage() {
  const { data: suppliers, isLoading, error, reload } = useApiData<PPESupplierWithUsage[]>('/api/ppe/suppliers', []);
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PPESupplierWithUsage | undefined>();
  const [deleting, setDeleting] = useState<PPESupplierWithUsage | undefined>();
  const [deactivating, setDeactivating] = useState<PPESupplierWithUsage | undefined>();

  async function setActive(supplier: PPESupplierWithUsage, isActive: boolean) {
    const body: SupplierInputBody & { id: number } = {
      id: supplier.ID,
      Supplier_Name: supplier.Supplier_Name,
      Contact_Details: supplier.Contact_Details,
      Is_Active: isActive,
    };
    try {
      await apiRequest('/api/ppe/suppliers', { method: 'PUT', body });
      toast({ title: isActive ? 'Supplier reactivated' : 'Supplier deactivated' });
      reload();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not update supplier', description: (err as Error).message });
    }
  }

  function requestDelete(supplier: PPESupplierWithUsage) {
    if (supplier.InvoiceCount > 0) setDeactivating(supplier);
    else setDeleting(supplier);
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await apiRequest(`/api/ppe/suppliers?id=${deleting.ID}`, { method: 'DELETE' });
      toast({ title: 'Supplier deleted' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not delete supplier', description: (err as Error).message });
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
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
            size="sm"
            className="h-8 px-2 sm:h-10 sm:px-4"
          >
            <Plus className="h-4 w-4 mr-1 sm:mr-2" />
            Add Supplier
          </Button>
        </div>

        <PPENav />

        {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <Card className="bg-white shadow-md">
            <CardContent className="p-0">
              {suppliers.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No suppliers yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="hidden md:table-cell">Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Invoices</TableHead>
                      <TableHead className="hidden sm:table-cell">Last Invoice</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((supplier) => (
                      <TableRow key={supplier.ID}>
                        <TableCell className="py-1.5 font-medium">{supplier.Supplier_Name}</TableCell>
                        <TableCell
                          className="py-1.5 hidden md:table-cell max-w-[260px] truncate"
                          title={supplier.Contact_Details ?? undefined}
                        >
                          {supplier.Contact_Details || '-'}
                        </TableCell>
                        <TableCell className="py-1.5">
                          <ActiveBadge isActive={supplier.Is_Active} />
                        </TableCell>
                        <TableCell className="py-1.5 text-right hidden sm:table-cell">{supplier.InvoiceCount}</TableCell>
                        <TableCell className="py-1.5 hidden sm:table-cell">{formatDisplayDate(supplier.LastInvoiceDate)}</TableCell>
                        <TableCell className="py-1.5 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Edit"
                              onClick={() => {
                                setEditing(supplier);
                                setFormOpen(true);
                              }}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title={supplier.Is_Active ? 'Deactivate' : 'Reactivate'}
                              onClick={() => setActive(supplier, !supplier.Is_Active)}
                            >
                              <Power className={supplier.Is_Active ? 'h-3.5 w-3.5' : 'h-3.5 w-3.5 text-green-600'} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={supplier.InvoiceCount > 0 && !supplier.Is_Active}
                              title={
                                supplier.InvoiceCount > 0
                                  ? 'Suppliers with invoices cannot be deleted, only deactivated'
                                  : 'Delete'
                              }
                              onClick={() => requestDelete(supplier)}
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

        <SupplierFormDialog open={formOpen} onOpenChange={setFormOpen} supplier={editing} onSaved={reload} />

        <ConfirmDeleteDialog
          open={Boolean(deleting)}
          onOpenChange={(open) => !open && setDeleting(undefined)}
          description={<>This will delete the supplier &quot;{deleting?.Supplier_Name}&quot;.</>}
          onConfirm={confirmDelete}
        />

        <ConfirmActionDialog
          open={Boolean(deactivating)}
          onOpenChange={(open) => !open && setDeactivating(undefined)}
          title="Supplier has invoices"
          description={
            <>
              {deactivating?.Supplier_Name} has {deactivating?.InvoiceCount} invoice
              {deactivating?.InvoiceCount === 1 ? '' : 's'}, so it cannot be deleted. Deactivate it instead? It will be
              hidden on new invoices but kept on existing ones.
            </>
          }
          actionLabel="Deactivate"
          onConfirm={() => {
            if (deactivating) setActive(deactivating, false);
            setDeactivating(undefined);
          }}
        />
      </div>
    </div>
  );
}
