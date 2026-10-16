'use client';

import { useEffect, useState } from 'react';
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
import type { PPEItemInputBody } from '@/lib/validations/capture';
import type { PPEItem } from '@/types/database';

interface PPEItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: PPEItem;
  onSaved: () => void;
}

export function PPEItemFormDialog({ open, onOpenChange, item, onSaved }: PPEItemFormDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isEdit = Boolean(item);

  useEffect(() => {
    if (!open) return;
    setName(item?.PPE_Item ?? '');
    setPrice(item?.PPE_Item_Value != null ? String(item.PPE_Item_Value) : '');
  }, [open, item]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const body: PPEItemInputBody & { id?: number } = {
      id: item?.ID,
      PPE_Item: name,
      PPE_Item_Value: price === '' ? NaN : Number(price),
    };

    setIsSaving(true);
    try {
      await apiRequest('/api/ppe/items', { method: isEdit ? 'PUT' : 'POST', body });
      toast({ title: isEdit ? 'PPE item updated' : 'PPE item added' });
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save PPE item', description: (error as Error).message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit PPE Item' : 'Add PPE Item'}</DialogTitle>
          <DialogDescription>
            The deduction price is what an employee is charged when this item is issued. Changing it does not
            affect issues already captured.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ppe-item-name">Item name *</Label>
            <Input
              id="ppe-item-name"
              value={name}
              maxLength={255}
              autoFocus
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ppe-item-price">Deduction price (R) *</Label>
            <Input
              id="ppe-item-price"
              type="number"
              min={0}
              step={0.01}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
