'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import { useToast } from '@/components/ui/use-toast';
import { apiRequest } from '@/lib/api-client';
import { useData } from '@/lib/contexts/data-context';
import { toDateOnlyFromDateParts } from '@/lib/date-time/south-africa';
import { formatCurrency } from '@/lib/format';
import type { PPEIssueInputBody } from '@/lib/validations/capture';
import type { PPEIssue, PPEItem } from '@/types/database';

interface PPEIssueFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issue?: PPEIssue;
  items: PPEItem[];
  onSaved: () => void;
}

interface FormState {
  employeeId: string;
  date: Date | undefined;
  itemId: string;
  amount: string;
}

export function PPEIssueFormDialog({ open, onOpenChange, issue, items, onSaved }: PPEIssueFormDialogProps) {
  const { employees } = useData();
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const employeeRef = useRef<HTMLButtonElement>(null);
  const isEdit = Boolean(issue);

  useEffect(() => {
    if (!open) return;
    setSavedCount(0);
    setForm(
      issue
        ? {
            employeeId: issue.EmployeeID ? String(issue.EmployeeID) : '',
            date: new Date(issue.Date),
            itemId: issue.PPEItemID ? String(issue.PPEItemID) : '',
            amount: String(issue.Amount),
          }
        : emptyForm()
    );
  }, [open, issue]);

  const employeeOptions = useMemo(
    () => employees.map((e) => ({ value: String(e.ID), label: e.EmplNo || 'Unnamed Employee' })),
    [employees]
  );
  const itemOptions = useMemo(
    () =>
      items.map((i) => ({
        value: String(i.ID),
        label: `${i.PPE_Item ?? 'Unnamed item'} (${formatCurrency(i.PPE_Item_Value)})`,
      })),
    [items]
  );
  const selectedItem = items.find((i) => String(i.ID) === form.itemId);

  function update(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function handleItemChange(itemId: string) {
    const item = items.find((i) => String(i.ID) === itemId);
    update({ itemId, amount: item?.PPE_Item_Value != null ? String(item.PPE_Item_Value) : '' });
  }

  async function save(addAnother: boolean) {
    if (!form.employeeId || !form.date || !form.itemId || form.amount === '') {
      toast({
        variant: 'destructive',
        title: 'Missing details',
        description: 'Select a date, employee and item, and enter the amount.',
      });
      return;
    }

    const body: PPEIssueInputBody & { id?: number } = {
      id: issue?.ID,
      EmployeeID: Number(form.employeeId),
      Date: toDateOnlyFromDateParts(form.date),
      PPEItemID: Number(form.itemId),
      Amount: Number(form.amount),
    };

    setIsSaving(true);
    try {
      await apiRequest('/api/ppe/issues', { method: isEdit ? 'PUT' : 'POST', body });
      onSaved();
      if (addAnother) {
        // Keep date, item and amount so a batch of the same item can be issued quickly.
        update({ employeeId: '' });
        setSavedCount((n) => n + 1);
        toast({ title: 'PPE issue added', description: 'Select the next employee.' });
        requestAnimationFrame(() => employeeRef.current?.focus());
      } else {
        toast({ title: isEdit ? 'PPE issue updated' : 'PPE issue added' });
        onOpenChange(false);
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save PPE issue', description: (error as Error).message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit PPE Issue' : 'Issue PPE'}</DialogTitle>
          <DialogDescription>
            The amount is deducted from the employee. It defaults to the item&apos;s deduction price.
            {savedCount > 0 && ` ${savedCount} captured in this batch.`}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            save(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Date *</Label>
            <DatePicker date={form.date} onSelect={(date) => update({ date })} disableFuture />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ppe-issue-employee">Employee *</Label>
            <Combobox
              ref={employeeRef}
              id="ppe-issue-employee"
              options={employeeOptions}
              value={form.employeeId}
              onValueChange={(employeeId) => update({ employeeId })}
              placeholder="Select employee"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ppe-issue-item">PPE item *</Label>
            <Combobox
              id="ppe-issue-item"
              options={itemOptions}
              value={form.itemId}
              onValueChange={handleItemChange}
              placeholder="Select item"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ppe-issue-amount">Amount (R) *</Label>
            <Input
              id="ppe-issue-amount"
              type="number"
              min={0}
              step={0.01}
              value={form.amount}
              onChange={(e) => update({ amount: e.target.value })}
            />
            {selectedItem && form.amount !== '' && Number(form.amount) !== selectedItem.PPE_Item_Value && (
              <p className="text-xs text-amber-700">
                Differs from the item&apos;s deduction price of {formatCurrency(selectedItem.PPE_Item_Value)}.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {savedCount > 0 ? 'Done' : 'Cancel'}
            </Button>
            {!isEdit && (
              <Button type="button" variant="secondary" disabled={isSaving} onClick={() => save(true)}>
                Save &amp; Add Another
              </Button>
            )}
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function emptyForm(): FormState {
  return { employeeId: '', date: new Date(), itemId: '', amount: '' };
}
