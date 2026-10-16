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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { apiRequest } from '@/lib/api-client';
import type { SupplierInputBody } from '@/lib/validations/capture';
import type { PPESupplier } from '@/types/database';

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: PPESupplier;
  onSaved: () => void;
}

export function SupplierFormDialog({ open, onOpenChange, supplier, onSaved }: SupplierFormDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const isEdit = Boolean(supplier);

  useEffect(() => {
    if (!open) return;
    setName(supplier?.Supplier_Name ?? '');
    setContact(supplier?.Contact_Details ?? '');
    setIsActive(supplier?.Is_Active ?? true);
  }, [open, supplier]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const body: SupplierInputBody & { id?: number } = {
      id: supplier?.ID,
      Supplier_Name: name,
      Contact_Details: contact,
      Is_Active: isActive,
    };

    setIsSaving(true);
    try {
      await apiRequest('/api/ppe/suppliers', { method: isEdit ? 'PUT' : 'POST', body });
      toast({ title: isEdit ? 'Supplier updated' : 'Supplier added' });
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save supplier', description: (error as Error).message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
          <DialogDescription>Who PPE is bought from. Only active suppliers can be chosen on new invoices.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supplier-name">Supplier name *</Label>
            <Input id="supplier-name" value={name} maxLength={150} autoFocus onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supplier-contact">Contact details</Label>
            <Textarea
              id="supplier-contact"
              rows={3}
              maxLength={500}
              value={contact}
              placeholder="Contact person, phone, email"
              onChange={(e) => setContact(e.target.value)}
            />
          </div>
          {isEdit && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Active (available on new invoices)
            </label>
          )}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Supplier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
