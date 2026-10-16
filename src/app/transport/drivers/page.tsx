'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Edit2, Plus, Power, Trash2 } from 'lucide-react';
import { DriverFormDialog } from '@/components/transport/driver-form-dialog';
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
import type { DriverInputBody } from '@/lib/validations/capture';
import type { TransportDriverWithUsage } from '@/types/database';

export default function TransportDriversPage() {
  const { data: drivers, isLoading, error, reload } = useApiData<TransportDriverWithUsage[]>(
    '/api/transport/drivers?all=1',
    []
  );
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TransportDriverWithUsage | undefined>();
  const [deleting, setDeleting] = useState<TransportDriverWithUsage | undefined>();
  const [deactivating, setDeactivating] = useState<TransportDriverWithUsage | undefined>();

  async function setActive(driver: TransportDriverWithUsage, isActive: boolean) {
    const body: DriverInputBody & { id: number } = { id: driver.ID, Driver_Name: driver.Driver_Name, Is_Active: isActive };
    try {
      await apiRequest('/api/transport/drivers', { method: 'PUT', body });
      toast({ title: isActive ? 'Driver reactivated' : 'Driver deactivated' });
      reload();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not update driver', description: (err as Error).message });
    }
  }

  function requestDelete(driver: TransportDriverWithUsage) {
    if (driver.UsageCount > 0) setDeactivating(driver);
    else setDeleting(driver);
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await apiRequest(`/api/transport/drivers?id=${deleting.ID}`, { method: 'DELETE' });
      toast({ title: 'Driver deleted' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not delete driver', description: (err as Error).message });
    } finally {
      setDeleting(undefined);
      reload();
    }
  }

  return (
    <div className="min-w-[250px] w-full">
      <div className="px-4 sm:px-6 lg:px-8 py-2 sm:py-6 w-full bg-gray-50/90">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <Link href="/transport" className="mb-1 inline-flex items-center text-sm text-muted-foreground hover:text-gray-900">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Transport
            </Link>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Drivers</h1>
          </div>
          <Button
            onClick={() => {
              setEditing(undefined);
              setFormOpen(true);
            }}
            size="sm"
            className="h-8 px-2 sm:h-10 sm:px-4"
          >
            <Plus className="h-4 w-4 mr-1 sm:mr-2" />
            Add Driver
          </Button>
        </div>

        {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <Card className="bg-white shadow-md">
            <CardContent className="p-0">
              {drivers.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No drivers yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">Transport Records</TableHead>
                      <TableHead className="hidden sm:table-cell">Last Used</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers.map((driver) => (
                      <TableRow key={driver.ID}>
                        <TableCell className="py-1.5 font-medium">{driver.Driver_Name}</TableCell>
                        <TableCell className="py-1.5">
                          <ActiveBadge isActive={driver.Is_Active} />
                        </TableCell>
                        <TableCell className="py-1.5 text-right hidden sm:table-cell">{driver.UsageCount}</TableCell>
                        <TableCell className="py-1.5 hidden sm:table-cell">{formatDisplayDate(driver.LastUsed)}</TableCell>
                        <TableCell className="py-1.5 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Edit"
                              onClick={() => {
                                setEditing(driver);
                                setFormOpen(true);
                              }}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title={driver.Is_Active ? 'Deactivate' : 'Reactivate'}
                              onClick={() => setActive(driver, !driver.Is_Active)}
                            >
                              <Power className={driver.Is_Active ? 'h-3.5 w-3.5' : 'h-3.5 w-3.5 text-green-600'} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={driver.UsageCount > 0 && !driver.Is_Active}
                              title={
                                driver.UsageCount > 0
                                  ? 'Drivers used on transport records cannot be deleted, only deactivated'
                                  : 'Delete'
                              }
                              onClick={() => requestDelete(driver)}
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

        <DriverFormDialog open={formOpen} onOpenChange={setFormOpen} driver={editing} onSaved={reload} />

        <ConfirmDeleteDialog
          open={Boolean(deleting)}
          onOpenChange={(open) => !open && setDeleting(undefined)}
          description={<>This will delete the driver &quot;{deleting?.Driver_Name}&quot;.</>}
          onConfirm={confirmDelete}
        />

        <ConfirmActionDialog
          open={Boolean(deactivating)}
          onOpenChange={(open) => !open && setDeactivating(undefined)}
          title="Driver is in use"
          description={
            <>
              {deactivating?.Driver_Name} is the driver on {deactivating?.UsageCount} transport record
              {deactivating?.UsageCount === 1 ? '' : 's'}, so it cannot be deleted. Deactivate it instead? It will be
              hidden when capturing transport but kept on existing records.
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
