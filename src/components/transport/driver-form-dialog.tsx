'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
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
import { apiRequest } from '@/lib/api-client';
import type { DriverInputBody } from '@/lib/validations/capture';
import type { TransportDriverWithUsage } from '@/types/database';

interface DriverFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver?: TransportDriverWithUsage;
  onSaved: () => void;
}

export function DriverFormDialog({ open, onOpenChange, driver, onSaved }: DriverFormDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const isEdit = Boolean(driver);
  const trimmedName = name.trim();
  const isRename = Boolean(driver && trimmedName && trimmedName !== driver.Driver_Name);
  const renamesHistory = isRename && (driver?.UsageCount ?? 0) > 0;

  useEffect(() => {
    if (!open) return;
    setName(driver?.Driver_Name ?? '');
    setIsActive(driver?.Is_Active ?? true);
  }, [open, driver]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const body: DriverInputBody & { id?: number } = { id: driver?.ID, Driver_Name: name, Is_Active: isActive };

    setIsSaving(true);
    try {
      const result = await apiRequest<{ transportRowsUpdated?: number }>('/api/transport/drivers', {
        method: isEdit ? 'PUT' : 'POST',
        body,
      });
      const renamed = result?.transportRowsUpdated ?? 0;
      toast({
        title: isEdit ? 'Driver updated' : 'Driver added',
        description: renamed > 0 ? `Renamed on ${renamed} transport record${renamed === 1 ? '' : 's'}.` : undefined,
      });
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save driver', description: (error as Error).message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Driver' : 'Add Driver'}</DialogTitle>
          <DialogDescription>
            Active drivers can be selected when capturing transport. Inactive drivers stay on old records.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="driver-name">Driver name *</Label>
            <Input id="driver-name" value={name} maxLength={50} autoFocus onChange={(e) => setName(e.target.value)} />
            {renamesHistory && driver && (
              <p className="flex items-start gap-1.5 rounded-md bg-amber-50 p-2 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>
                  Saving will also change the driver on {driver.UsageCount} existing transport record
                  {driver.UsageCount === 1 ? '' : 's'} from &quot;{driver.Driver_Name}&quot; to &quot;{trimmedName}&quot;, so
                  their history stays together.
                </span>
              </p>
            )}
          </div>
          {isEdit && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Active (available when capturing transport)
            </label>
          )}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : renamesHistory ? 'Rename Driver' : isEdit ? 'Save Changes' : 'Add Driver'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
