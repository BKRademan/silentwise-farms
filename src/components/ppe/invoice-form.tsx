'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Info, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useApiData } from '@/hooks/use-api-data';
import { usePPEItems } from '@/hooks/use-ppe-items';
import { apiRequest } from '@/lib/api-client';
import { isBeforeStockTracking, MAX_INVOICE_LINES, PPE_STOCK_TRACKING_START } from '@/lib/constants/ppe';
import { fromDateOnly, toDateOnlyFromDateParts } from '@/lib/date-time/south-africa';
import { formatCurrency, formatDisplayDate } from '@/lib/format';
import { hasAtMostTwoDecimals, lineTotal, sumMoney, toCents } from '@/lib/money';
import type { InvoiceInputBody } from '@/lib/validations/capture';
import type { PPEInvoiceDetail, PPEItemWithUsage, PPESupplierWithUsage } from '@/types/database';

interface InvoiceFormProps {
  invoice?: PPEInvoiceDetail;
}

interface LineState {
  key: number;
  itemId: string;
  quantity: string;
  unitCost: string;
}

interface FormState {
  supplierId: string;
  invoiceNo: string;
  date: Date | undefined;
  notes: string;
  lines: LineState[];
}

/** Capture or edit a supplier invoice. Saving never changes an item's deduction price. */
export function InvoiceForm({ invoice }: InvoiceFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { items, reload: reloadItems } = usePPEItems();
  const { data: suppliers } = useApiData<PPESupplierWithUsage[]>('/api/ppe/suppliers', []);
  const nextKey = useRef(0);
  const createLine = (line?: Partial<LineState>): LineState => ({
    key: nextKey.current++,
    itemId: '',
    quantity: '1',
    unitCost: '',
    ...line,
  });
  const [form, setForm] = useState<FormState>(() => initialForm(invoice, createLine));
  const [isSaving, setIsSaving] = useState(false);
  const [pricingItemId, setPricingItemId] = useState<number | null>(null);
  const isEdit = Boolean(invoice);

  const supplierOptions = useMemo(
    () =>
      suppliers
        .filter((s) => s.Is_Active || s.ID === invoice?.Supplier_ID)
        .map((s) => ({ value: String(s.ID), label: s.Is_Active ? s.Supplier_Name : `${s.Supplier_Name} (inactive)` })),
    [suppliers, invoice?.Supplier_ID]
  );
  const itemOptions = useMemo(
    () => items.map((i) => ({ value: String(i.ID), label: i.PPE_Item || 'Unnamed item' })),
    [items]
  );
  const total = sumMoney(form.lines.map((line) => parsedLineTotal(line)));

  function update(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function updateLine(key: number, patch: Partial<LineState>) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    }));
  }

  function addLine() {
    setForm((current) => ({ ...current, lines: [...current.lines, createLine()] }));
  }

  function removeLine(key: number) {
    setForm((current) => ({ ...current, lines: current.lines.filter((line) => line.key !== key) }));
  }

  async function setDeductionPrice(item: PPEItemWithUsage, price: number) {
    setPricingItemId(item.ID);
    try {
      await apiRequest('/api/ppe/items', { method: 'PATCH', body: { id: item.ID, PPE_Item_Value: price } });
      toast({ title: 'Deduction price updated', description: `${item.PPE_Item} is now ${formatCurrency(price)}.` });
      await reloadItems();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not update deduction price', description: (error as Error).message });
    } finally {
      setPricingItemId(null);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const problem = findProblem(form);
    if (problem) {
      toast({ variant: 'destructive', title: 'Check the invoice', description: problem });
      return;
    }

    const body: InvoiceInputBody & { id?: number } = {
      id: invoice?.ID,
      Supplier_ID: Number(form.supplierId),
      Invoice_No: form.invoiceNo,
      Invoice_Date: toDateOnlyFromDateParts(form.date as Date),
      Notes: form.notes,
      Lines: form.lines.map((line) => ({
        PPE_Item_ID: Number(line.itemId),
        Quantity: Number(line.quantity),
        Unit_Cost_Excl_VAT: Number(line.unitCost),
      })),
    };

    setIsSaving(true);
    try {
      await apiRequest('/api/ppe/invoices', { method: isEdit ? 'PUT' : 'POST', body });
      toast({ title: isEdit ? 'Invoice updated' : 'Invoice captured' });
      router.push('/ppe/invoices');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Could not save invoice', description: (error as Error).message });
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card className="bg-white shadow-md">
        <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3 sm:p-6">
          <div className="space-y-2">
            <Label htmlFor="invoice-supplier">Supplier *</Label>
            <Combobox
              id="invoice-supplier"
              options={supplierOptions}
              value={form.supplierId}
              onValueChange={(supplierId) => update({ supplierId })}
              placeholder="Select supplier"
            />
            {supplierOptions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No active suppliers.{' '}
                <Link href="/ppe/suppliers" className="underline">
                  Add one under Suppliers
                </Link>
                .
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice-number">Invoice number *</Label>
            <Input
              id="invoice-number"
              value={form.invoiceNo}
              maxLength={50}
              onChange={(e) => update({ invoiceNo: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Invoice date *</Label>
            <DatePicker date={form.date} onSelect={(date) => update({ date })} disableFuture />
            {isBeforeStockTracking(form.date) && (
              <p className="text-xs text-amber-700">
                Invoices dated before {formatDisplayDate(PPE_STOCK_TRACKING_START)} are not counted in stock on hand.
              </p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="invoice-notes">Notes</Label>
            <Textarea
              id="invoice-notes"
              rows={2}
              maxLength={1000}
              value={form.notes}
              onChange={(e) => update({ notes: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white shadow-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Item</TableHead>
                <TableHead className="w-28 text-right">Quantity</TableHead>
                <TableHead className="w-36 text-right">Unit Cost excl VAT</TableHead>
                <TableHead className="w-32 text-right">Line Total</TableHead>
                <TableHead className="min-w-[200px]">Deduction Price</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {form.lines.map((line, index) => {
                const item = items.find((i) => String(i.ID) === line.itemId);
                const unitCost = parseAmount(line.unitCost);
                const differsFromPrice =
                  item != null && unitCost != null && toCents(unitCost) !== toCents(item.PPE_Item_Value);
                return (
                  <TableRow key={line.key}>
                    <TableCell className="py-2">
                      <Combobox
                        id={`invoice-line-${index}-item`}
                        options={itemOptions}
                        value={line.itemId}
                        onValueChange={(itemId) => updateLine(line.key, { itemId })}
                        placeholder="Select item"
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <Input
                        aria-label={`Line ${index + 1} quantity`}
                        type="number"
                        min={0.01}
                        step={0.01}
                        className="text-right"
                        value={line.quantity}
                        onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <Input
                        aria-label={`Line ${index + 1} unit cost excluding VAT`}
                        type="number"
                        min={0}
                        step={0.01}
                        className="text-right"
                        value={line.unitCost}
                        onChange={(e) => updateLine(line.key, { unitCost: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="py-2 text-right font-medium whitespace-nowrap">
                      {formatCurrency(parsedLineTotal(line))}
                    </TableCell>
                    <TableCell className="py-2 text-sm">
                      {item ? (
                        <div className="space-y-1">
                          <div className="text-muted-foreground">Currently {formatCurrency(item.PPE_Item_Value)}</div>
                          {differsFromPrice && unitCost != null && (
                            <Button
                              type="button"
                              variant="link"
                              className="h-auto p-0 text-sm"
                              disabled={pricingItemId === item.ID}
                              onClick={() => setDeductionPrice(item, unitCost)}
                            >
                              {pricingItemId === item.ID ? 'Updating...' : `Set deduction price to ${formatCurrency(unitCost)}`}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Remove line"
                        disabled={form.lines.length === 1}
                        onClick={() => removeLine(line.key)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLine}
              disabled={form.lines.length >= MAX_INVOICE_LINES}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Line
            </Button>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total excl VAT</div>
              <div className="text-xl font-bold">{formatCurrency(total)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        Amounts are excluding VAT. Saving the invoice does not change any deduction price; use the &quot;Set deduction
        price&quot; link on a line if you want the employee price to follow the new cost.
      </p>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" asChild>
          <Link href="/ppe/invoices">Cancel</Link>
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Invoice'}
        </Button>
      </div>
    </form>
  );
}

function initialForm(invoice: PPEInvoiceDetail | undefined, createLine: (line?: Partial<LineState>) => LineState): FormState {
  if (!invoice) {
    return { supplierId: '', invoiceNo: '', date: new Date(), notes: '', lines: [createLine()] };
  }
  return {
    supplierId: String(invoice.Supplier_ID),
    invoiceNo: invoice.Invoice_No,
    date: fromDateOnly(invoice.Invoice_Date) ?? undefined,
    notes: invoice.Notes ?? '',
    lines: invoice.Lines.length
      ? invoice.Lines.map((line) =>
          createLine({
            itemId: String(line.PPE_Item_ID),
            quantity: String(line.Quantity),
            unitCost: String(line.Unit_Cost_Excl_VAT),
          })
        )
      : [createLine()],
  };
}

/** A non-negative amount with at most 2 decimals, else null (blank or invalid input). */
function parseAmount(value: string): number | null {
  if (value.trim() === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && hasAtMostTwoDecimals(amount) ? amount : null;
}

function parsedLineTotal(line: LineState): number {
  const quantity = parseAmount(line.quantity);
  const unitCost = parseAmount(line.unitCost);
  return quantity != null && unitCost != null ? lineTotal(quantity, unitCost) : 0;
}

function findProblem(form: FormState): string | null {
  if (!form.supplierId) return 'Select a supplier.';
  if (!form.invoiceNo.trim()) return 'Enter the invoice number.';
  if (!form.date) return 'Select the invoice date.';
  if (form.lines.length === 0) return 'Add at least one line.';
  return form.lines.map(findLineProblem).find((problem) => problem != null) ?? null;
}

function findLineProblem(line: LineState, index: number): string | null {
  const label = `Line ${index + 1}`;
  const quantity = parseAmount(line.quantity);
  if (!line.itemId) return `${label}: select an item.`;
  if (quantity == null || quantity <= 0) return `${label}: enter a quantity greater than 0 (at most 2 decimals).`;
  if (parseAmount(line.unitCost) == null) return `${label}: enter the unit cost excl VAT (at most 2 decimals).`;
  return null;
}
