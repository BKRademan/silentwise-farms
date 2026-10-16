'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { apiRequest } from '@/lib/api-client';
import { useData } from '@/lib/contexts/data-context';
import { toDateOnlyFromDateParts } from '@/lib/date-time/south-africa';
import { formatCurrency } from '@/lib/format';
import type { TransportInputBody } from '@/lib/validations/capture';
import type { TransportDriver, TransportRecord } from '@/types/database';

interface TransportFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: TransportRecord;
  /** All drivers (active first); only active ones are offered for new selections. */
  drivers: TransportDriver[];
  onSaved: () => void;
}

interface FormState {
  growerId: string;
  date: Date | undefined;
  days: string;
  ratePerDay: number | null;
  driver: string;
  comment: string;
}

export function TransportFormDialog({ open, onOpenChange, record, drivers, onSaved }: TransportFormDialogProps) {
  const { growers } = useData();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const isEdit = Boolean(record);
  const recordDriver = useMemo(
    () => (record ? findDriver(drivers, record.Driver)?.Driver_Name ?? record.Driver?.trim() ?? '' : ''),
    [drivers, record]
  );

  useEffect(() => {
    if (!open) return;
    setForm(
      record
        ? {
            growerId: String(record.Grower_ID_FK),
            date: new Date(record.Date),
            days: String(record.Days),
            ratePerDay: record.RatePerDay,
            driver: recordDriver,
            comment: record.Comment ?? '',
          }
        : { ...emptyForm(), driver: drivers.find((d) => d.Is_Active)?.Driver_Name ?? '' }
    );
  }, [open, record, drivers, recordDriver]);

  const growerOptions = useMemo(
    () => growers.map((g) => ({ value: String(g.ID), label: g.GrowerName || 'Unnamed Grower' })),
    [growers]
  );
  const driverOptions = useMemo(() => buildDriverOptions(drivers, recordDriver), [drivers, recordDriver]);
  const selectedGrower = growers.find((g) => String(g.ID) === form.growerId);
  const growerRate = selectedGrower?.RatePerKM ?? null;
  const days = Number(form.days);
  const total = Number.isFinite(days) ? days * (form.ratePerDay ?? 0) : 0;

  function update(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function handleGrowerChange(growerId: string) {
    const grower = growers.find((g) => String(g.ID) === growerId);
    update({ growerId, ratePerDay: grower?.RatePerKM ?? null });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.growerId || !form.date) {
      toast({ variant: 'destructive', title: 'Missing details', description: 'Select a grower and a date.' });
      return;
    }

    const body: TransportInputBody & { id?: number } = {
      id: record?.ID,
      Grower_ID_FK: Number(form.growerId),
      Date: toDateOnlyFromDateParts(form.date),
      Days: days,
      RatePerDay: form.ratePerDay,
      Driver: form.driver,
      Comment: form.comment,
    };

    setIsSaving(true);
    try {
      await apiRequest('/api/transport', { method: isEdit ? 'PUT' : 'POST', body });
      toast({ title: isEdit ? 'Transport updated' : 'Transport added' });
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save transport', description: (error as Error).message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Transport' : 'Capture Transport'}</DialogTitle>
          <DialogDescription>
            Transport is charged per day at the grower&apos;s transport rate.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Grower *</Label>
            <Combobox
              options={growerOptions}
              value={form.growerId}
              onValueChange={handleGrowerChange}
              placeholder="Select grower"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Date *</Label>
              <DatePicker date={form.date} onSelect={(date) => update({ date })} disableFuture />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transport-days">Days *</Label>
              <Input
                id="transport-days"
                type="number"
                min={0.5}
                step={0.5}
                value={form.days}
                onChange={(e) => update({ days: e.target.value })}
              />
            </div>
          </div>

          <div className="rounded-md border bg-gray-50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Rate per day</span>
              <span className="font-medium">{form.growerId ? formatCurrency(form.ratePerDay) : '-'}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">{form.growerId ? formatCurrency(total) : '-'}</span>
            </div>
            {form.growerId && !form.ratePerDay && (
              <p className="mt-2 flex items-center gap-1.5 text-amber-700">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                This grower has no transport rate set.
              </p>
            )}
            {isEdit && form.growerId && growerRate != null && growerRate !== form.ratePerDay && (
              <Button
                type="button"
                variant="link"
                className="mt-1 h-auto p-0 text-sm"
                onClick={() => update({ ratePerDay: growerRate })}
              >
                Use the grower&apos;s current rate ({formatCurrency(growerRate)})
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="transport-driver">Driver</Label>
            <Combobox
              id="transport-driver"
              options={driverOptions}
              value={form.driver}
              onValueChange={(driver) => update({ driver })}
              placeholder="Select driver"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transport-comment">Comment</Label>
            <Textarea
              id="transport-comment"
              rows={3}
              value={form.comment}
              onChange={(e) => update({ comment: e.target.value })}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Transport'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function emptyForm(): FormState {
  return { growerId: '', date: new Date(), days: '1', ratePerDay: null, driver: '', comment: '' };
}

/** Driver names match case-insensitively and ignoring surrounding spaces, like the database. */
function findDriver(drivers: TransportDriver[], name: string | null | undefined): TransportDriver | undefined {
  const key = name?.trim().toLowerCase();
  return key ? drivers.find((d) => d.Driver_Name.toLowerCase() === key) : undefined;
}

/** Active drivers, plus the edited record's driver when it is inactive or not in the list. */
function buildDriverOptions(drivers: TransportDriver[], recordDriver: string) {
  const options = drivers.filter((d) => d.Is_Active).map((d) => ({ value: d.Driver_Name, label: d.Driver_Name }));
  if (recordDriver && !options.some((option) => option.value === recordDriver)) {
    const suffix = findDriver(drivers, recordDriver) ? 'inactive' : 'not in driver list';
    options.unshift({ value: recordDriver, label: `${recordDriver} (${suffix})` });
  }
  return options;
}
