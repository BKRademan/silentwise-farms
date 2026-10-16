'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { fromDateOnly, toDateOnlyFromDateParts } from '@/lib/date-time/south-africa';
import { hasAtMostTwoDecimals } from '@/lib/money';
import type { GrowerChargeInputBody } from '@/lib/validations/capture';
import type { PPEGrowerCharge } from '@/types/database';

interface GrowerChargeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  charge?: PPEGrowerCharge;
  onSaved: () => void;
}

interface FormState {
  growerId: string;
  date: Date | undefined;
  reference: string;
  amount: string;
  notes: string;
}

export function GrowerChargeFormDialog({ open, onOpenChange, charge, onSaved }: GrowerChargeFormDialogProps) {
  const { growers } = useData();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const isEdit = Boolean(charge);

  useEffect(() => {
    if (!open) return;
    setForm(
      charge
        ? {
            growerId: String(charge.Grower_ID),
            date: fromDateOnly(charge.Charge_Date) ?? undefined,
            reference: charge.Reference ?? '',
            amount: String(charge.Amount_Excl_VAT),
            notes: charge.Notes ?? '',
          }
        : emptyForm()
    );
  }, [open, charge]);

  const growerOptions = useMemo(
    () => growers.map((g) => ({ value: String(g.ID), label: g.GrowerName || 'Unnamed Grower' })),
    [growers]
  );

  function update(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.growerId || !form.date || form.amount.trim() === '') {
      toast({ variant: 'destructive', title: 'Missing details', description: 'Select a grower and date, and enter the amount.' });
      return;
    }
    if (!Number.isFinite(amount) || amount < 0 || !hasAtMostTwoDecimals(amount)) {
      toast({ variant: 'destructive', title: 'Check the amount', description: 'Enter an amount of 0 or more with at most 2 decimals.' });
      return;
    }

    const body: GrowerChargeInputBody & { id?: number } = {
      id: charge?.ID,
      Grower_ID: Number(form.growerId),
      Charge_Date: toDateOnlyFromDateParts(form.date),
      Reference: form.reference,
      Amount_Excl_VAT: amount,
      Notes: form.notes,
    };

    setIsSaving(true);
    try {
      await apiRequest('/api/ppe/grower-charges', { method: isEdit ? 'PUT' : 'POST', body });
      toast({ title: isEdit ? 'Grower charge updated' : 'Grower charge added' });
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save grower charge', description: (error as Error).message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Grower Charge' : 'Add Grower Charge'}</DialogTitle>
          <DialogDescription>The total PPE amount invoiced on to a grower, excluding VAT.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="grower-charge-grower">Grower *</Label>
            <Combobox
              id="grower-charge-grower"
              options={growerOptions}
              value={form.growerId}
              onValueChange={(growerId) => update({ growerId })}
              placeholder="Select grower"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Date *</Label>
              <DatePicker date={form.date} onSelect={(date) => update({ date })} disableFuture />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grower-charge-amount">Amount excl VAT (R) *</Label>
              <Input
                id="grower-charge-amount"
                type="number"
                min={0}
                step={0.01}
                value={form.amount}
                onChange={(e) => update({ amount: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="grower-charge-reference">Reference</Label>
            <Input
              id="grower-charge-reference"
              value={form.reference}
              maxLength={50}
              placeholder="Grower invoice number"
              onChange={(e) => update({ reference: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="grower-charge-notes">Notes</Label>
            <Textarea
              id="grower-charge-notes"
              rows={2}
              maxLength={500}
              value={form.notes}
              onChange={(e) => update({ notes: e.target.value })}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Charge'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function emptyForm(): FormState {
  return { growerId: '', date: new Date(), reference: '', amount: '', notes: '' };
}
