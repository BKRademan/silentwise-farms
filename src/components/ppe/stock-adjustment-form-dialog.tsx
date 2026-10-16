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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { apiRequest } from '@/lib/api-client';
import {
  isBeforeStockTracking,
  PPE_STOCK_TRACKING_START,
  STOCK_ADJUSTMENT_REASONS,
  type StockAdjustmentReason,
} from '@/lib/constants/ppe';
import { fromDateOnly, toDateOnlyFromDateParts } from '@/lib/date-time/south-africa';
import { formatDisplayDate } from '@/lib/format';
import { hasAtMostTwoDecimals } from '@/lib/money';
import type { StockAdjustmentInputBody } from '@/lib/validations/capture';
import type { PPEItem, PPEStockAdjustment } from '@/types/database';

interface StockAdjustmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adjustment?: PPEStockAdjustment;
  /** Pre-selects the item when adding from a stock row. */
  defaultItemId?: number;
  items: PPEItem[];
  onSaved: () => void;
}

interface FormState {
  itemId: string;
  date: Date | undefined;
  quantity: string;
  reason: StockAdjustmentReason | '';
  notes: string;
}

const REASON_OPTIONS = Object.entries(STOCK_ADJUSTMENT_REASONS) as Array<[StockAdjustmentReason, string]>;

export function StockAdjustmentFormDialog({
  open,
  onOpenChange,
  adjustment,
  defaultItemId,
  items,
  onSaved,
}: StockAdjustmentFormDialogProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const isEdit = Boolean(adjustment);

  useEffect(() => {
    if (!open) return;
    setForm(
      adjustment
        ? {
            itemId: String(adjustment.PPE_Item_ID),
            date: fromDateOnly(adjustment.Adjustment_Date) ?? undefined,
            quantity: String(adjustment.Quantity),
            reason: adjustment.Reason in STOCK_ADJUSTMENT_REASONS ? (adjustment.Reason as StockAdjustmentReason) : '',
            notes: adjustment.Notes ?? '',
          }
        : { ...emptyForm(), itemId: defaultItemId ? String(defaultItemId) : '' }
    );
  }, [open, adjustment, defaultItemId]);

  const itemOptions = useMemo(
    () => items.map((i) => ({ value: String(i.ID), label: i.PPE_Item || 'Unnamed item' })),
    [items]
  );

  function update(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const problem = findProblem(form);
    if (problem || !form.date || !form.reason) {
      toast({ variant: 'destructive', title: 'Check the adjustment', description: problem ?? undefined });
      return;
    }
    const quantity = Number(form.quantity);

    const body: StockAdjustmentInputBody & { id?: number } = {
      id: adjustment?.ID,
      PPE_Item_ID: Number(form.itemId),
      Adjustment_Date: toDateOnlyFromDateParts(form.date),
      Quantity: quantity,
      Reason: form.reason,
      Notes: form.notes,
    };

    setIsSaving(true);
    try {
      await apiRequest('/api/ppe/stock/adjustments', { method: isEdit ? 'PUT' : 'POST', body });
      toast({ title: isEdit ? 'Stock adjustment updated' : 'Stock adjustment added' });
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save stock adjustment', description: (error as Error).message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Stock Adjustment' : 'Stock Adjustment'}</DialogTitle>
          <DialogDescription>
            Use a positive quantity to add stock (e.g. opening stock) and a negative quantity to remove it (e.g.
            write-offs or a stock-take shortfall).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stock-adjustment-item">PPE item *</Label>
            <Combobox
              id="stock-adjustment-item"
              options={itemOptions}
              value={form.itemId}
              onValueChange={(itemId) => update({ itemId })}
              placeholder="Select item"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Date *</Label>
              <DatePicker date={form.date} onSelect={(date) => update({ date })} disableFuture />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock-adjustment-quantity">Quantity (+/-) *</Label>
              <Input
                id="stock-adjustment-quantity"
                type="number"
                step={0.01}
                value={form.quantity}
                onChange={(e) => update({ quantity: e.target.value })}
              />
            </div>
          </div>
          {isBeforeStockTracking(form.date) && (
            <p className="text-xs text-red-600">
              Stock is tracked from {formatDisplayDate(PPE_STOCK_TRACKING_START)}; adjustments must be dated on or after that.
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="stock-adjustment-reason">Reason *</Label>
            <Select value={form.reason} onValueChange={(reason) => update({ reason: reason as StockAdjustmentReason })}>
              <SelectTrigger id="stock-adjustment-reason">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock-adjustment-notes">Notes</Label>
            <Textarea
              id="stock-adjustment-notes"
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
              {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Adjustment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function emptyForm(): FormState {
  return { itemId: '', date: new Date(), quantity: '', reason: '', notes: '' };
}

function findProblem(form: FormState): string | null {
  const quantity = Number(form.quantity);
  if (!form.itemId) return 'Select an item.';
  if (!form.date) return 'Select a date.';
  if (isBeforeStockTracking(form.date)) {
    return `Stock is tracked from ${formatDisplayDate(PPE_STOCK_TRACKING_START)}; pick that date or later.`;
  }
  if (form.quantity.trim() === '' || !Number.isFinite(quantity) || quantity === 0) {
    return 'Enter a quantity other than 0 (negative to remove stock).';
  }
  if (!hasAtMostTwoDecimals(quantity)) return 'The quantity can have at most 2 decimals.';
  if (!form.reason) return 'Select a reason.';
  return null;
}
