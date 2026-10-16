import { BaseDAO, decimalParam, TransactionContext } from './base-dao';
import { isConstraintConflict, isUniqueViolation } from './sql-errors';
import { ValidationError } from '@/lib/api-utils';
import { formatDisplayDate } from '@/lib/format';
import type { InvoiceInput } from '@/lib/validations/capture';
import type { PPEInvoiceDetail, PPEInvoiceLine, PPEInvoiceSummary } from '@/types/database';

export interface InvoiceFilters {
  startDate: string;
  endDate: string;
  supplierId?: number;
}

const INVOICE_UNIQUE = 'UQ_TPPE_Invoices_SupplierInvoice';
const INVOICE_SUPPLIER_FK = 'FK_TPPE_Invoices_Supplier';
const LINE_ITEM_FK = 'FK_TPPE_Invoice_Lines_Item';

const SELECT_INVOICE_SUMMARY = `
  SELECT i.ID, i.Supplier_ID, s.Supplier_Name, i.Invoice_No,
         CONVERT(char(10), i.Invoice_Date, 23) AS Invoice_Date, i.Notes,
         COUNT(l.ID) AS LineCount,
         COALESCE(SUM(l.Line_Total_Excl_VAT), 0) AS Total_Excl_VAT
  FROM dbo.TPPE_Invoices i
  INNER JOIN dbo.TPPE_Suppliers s ON s.ID = i.Supplier_ID
  LEFT JOIN dbo.TPPE_Invoice_Lines l ON l.Invoice_ID = i.ID`;

const GROUP_INVOICE_SUMMARY = `
  GROUP BY i.ID, i.Supplier_ID, s.Supplier_Name, i.Invoice_No, i.Invoice_Date, i.Notes`;

function duplicateInvoiceMessage(invoiceNo: string, invoiceDate?: string): string {
  const dated = invoiceDate ? ` (dated ${formatDisplayDate(invoiceDate)})` : '';
  return `Invoice ${invoiceNo} from this supplier has already been captured${dated}`;
}

/**
 * Supplier invoices (`TPPE_Invoices`) and their lines (`TPPE_Invoice_Lines`). A header and its
 * lines are always written together in one transaction. Saving never touches PPE item prices.
 */
export class PPEInvoiceDAO extends BaseDAO<PPEInvoiceSummary> {
  constructor() {
    super('dbo.TPPE_Invoices');
  }

  async list({ startDate, endDate, supplierId }: InvoiceFilters): Promise<PPEInvoiceSummary[]> {
    return this.executeQuery<PPEInvoiceSummary>(
      `${SELECT_INVOICE_SUMMARY}
       WHERE i.Invoice_Date >= CONVERT(date, @startDate, 23)
         AND i.Invoice_Date <= CONVERT(date, @endDate, 23)
         ${supplierId ? 'AND i.Supplier_ID = @supplierId' : ''}
       ${GROUP_INVOICE_SUMMARY}
       ORDER BY i.Invoice_Date DESC, i.ID DESC`,
      { startDate, endDate, ...(supplierId ? { supplierId } : {}) }
    );
  }

  async getDetail(id: number): Promise<PPEInvoiceDetail | null> {
    const [headers, lines] = await Promise.all([
      this.executeQuery<PPEInvoiceSummary & { Supplier_Is_Active: boolean }>(
        `SELECT q.*, s.Is_Active AS Supplier_Is_Active
         FROM (${SELECT_INVOICE_SUMMARY} WHERE i.ID = @id ${GROUP_INVOICE_SUMMARY}) q
         INNER JOIN dbo.TPPE_Suppliers s ON s.ID = q.Supplier_ID`,
        { id }
      ),
      this.executeQuery<PPEInvoiceLine>(
        `SELECT l.ID, l.PPE_Item_ID, p.PPE_Item, l.Quantity, l.Unit_Cost_Excl_VAT, l.Line_Total_Excl_VAT
         FROM dbo.TPPE_Invoice_Lines l
         LEFT JOIN dbo.TPPE_Items p ON p.ID = l.PPE_Item_ID
         WHERE l.Invoice_ID = @id
         ORDER BY l.ID`,
        { id }
      ),
    ]);
    return headers[0] ? { ...headers[0], Lines: lines } : null;
  }

  /** Creates (`id` null) or replaces an invoice: header plus all lines in one transaction. */
  async save(id: number | null, input: InvoiceInput): Promise<{ ID: number }> {
    try {
      return await this.withTransaction(async (tx) => {
        const currentSupplierId = id ? await this.lockInvoice(tx, id) : null;
        await this.assertSupplierSelectable(tx, input.Supplier_ID, currentSupplierId);
        await this.assertNotDuplicate(tx, input, id);
        await this.assertItemsExist(tx, input.Lines.map((line) => line.PPE_Item_ID));

        const header = {
          supplierId: input.Supplier_ID,
          invoiceNo: input.Invoice_No,
          invoiceDate: input.Invoice_Date,
          notes: input.Notes,
        };

        let invoiceId: number;
        if (id) {
          await tx.query(
            `UPDATE ${this.tableName}
             SET Supplier_ID = @supplierId,
                 Invoice_No = @invoiceNo,
                 Invoice_Date = CONVERT(date, @invoiceDate, 23),
                 Notes = @notes,
                 Updated_At = SYSUTCDATETIME()
             WHERE ID = @id;
             DELETE FROM dbo.TPPE_Invoice_Lines WHERE Invoice_ID = @id;`,
            { ...header, id }
          );
          invoiceId = id;
        } else {
          const rows = await tx.query<{ ID: number }>(
            `INSERT INTO ${this.tableName} (Supplier_ID, Invoice_No, Invoice_Date, Notes)
             OUTPUT INSERTED.ID
             VALUES (@supplierId, @invoiceNo, CONVERT(date, @invoiceDate, 23), @notes)`,
            header
          );
          invoiceId = rows[0].ID;
        }

        await this.insertLines(tx, invoiceId, input.Lines);
        return { ID: invoiceId };
      });
    } catch (error) {
      throw this.toFriendlyError(error, input);
    }
  }

  /** Lines are removed by the `ON DELETE CASCADE` foreign key. */
  async remove(id: number): Promise<void> {
    const rows = await this.executeQuery<{ n: number }>(
      `DELETE FROM ${this.tableName} WHERE ID = @id; SELECT @@ROWCOUNT AS n;`,
      { id }
    );
    if (!rows[0]?.n) throw new ValidationError('Invoice not found');
  }

  private async lockInvoice(tx: TransactionContext, id: number): Promise<number> {
    const rows = await tx.query<{ Supplier_ID: number }>(
      `SELECT Supplier_ID FROM ${this.tableName} WITH (UPDLOCK, HOLDLOCK) WHERE ID = @id`,
      { id }
    );
    if (!rows[0]) throw new ValidationError('Invoice not found');
    return rows[0].Supplier_ID;
  }

  /** New invoices need an active supplier; an existing invoice may keep its (now inactive) supplier. */
  private async assertSupplierSelectable(
    tx: TransactionContext,
    supplierId: number,
    currentSupplierId: number | null
  ): Promise<void> {
    const rows = await tx.query<{ Supplier_Name: string; Is_Active: boolean }>(
      `SELECT Supplier_Name, Is_Active FROM dbo.TPPE_Suppliers WHERE ID = @supplierId`,
      { supplierId }
    );
    const supplier = rows[0];
    if (!supplier) throw new ValidationError('Supplier not found');
    if (!supplier.Is_Active && supplierId !== currentSupplierId) {
      throw new ValidationError(`${supplier.Supplier_Name} is inactive. Reactivate it under Suppliers or choose another supplier.`);
    }
  }

  private async assertNotDuplicate(tx: TransactionContext, input: InvoiceInput, excludeId: number | null): Promise<void> {
    const rows = await tx.query<{ Invoice_Date: string }>(
      `SELECT CONVERT(char(10), Invoice_Date, 23) AS Invoice_Date
       FROM ${this.tableName}
       WHERE Supplier_ID = @supplierId AND Invoice_No = @invoiceNo ${excludeId ? 'AND ID <> @excludeId' : ''}`,
      { supplierId: input.Supplier_ID, invoiceNo: input.Invoice_No, ...(excludeId ? { excludeId } : {}) }
    );
    if (rows[0]) throw new ValidationError(duplicateInvoiceMessage(input.Invoice_No, rows[0].Invoice_Date));
  }

  private async assertItemsExist(tx: TransactionContext, itemIds: number[]): Promise<void> {
    const uniqueIds = Array.from(new Set(itemIds));
    const params = Object.fromEntries(uniqueIds.map((itemId, index) => [`item${index}`, itemId]));
    const rows = await tx.query<{ ID: number }>(
      `SELECT ID FROM dbo.TPPE_Items WHERE ID IN (${uniqueIds.map((_, index) => `@item${index}`).join(', ')})`,
      params
    );
    if (rows.length !== uniqueIds.length) {
      throw new ValidationError('A PPE item on this invoice no longer exists. Reload the page and check the lines.');
    }
  }

  private async insertLines(tx: TransactionContext, invoiceId: number, lines: InvoiceInput['Lines']): Promise<void> {
    const params: Record<string, unknown> = { invoiceId };
    const values = lines.map((line, index) => {
      params[`item${index}`] = line.PPE_Item_ID;
      params[`qty${index}`] = decimalParam(line.Quantity, 10);
      params[`cost${index}`] = decimalParam(line.Unit_Cost_Excl_VAT, 12);
      return `(@invoiceId, @item${index}, @qty${index}, @cost${index})`;
    });
    await tx.query(
      `INSERT INTO dbo.TPPE_Invoice_Lines (Invoice_ID, PPE_Item_ID, Quantity, Unit_Cost_Excl_VAT)
       VALUES ${values.join(',\n              ')}`,
      params
    );
  }

  private toFriendlyError(error: unknown, input: InvoiceInput): unknown {
    if (isUniqueViolation(error, INVOICE_UNIQUE)) return new ValidationError(duplicateInvoiceMessage(input.Invoice_No));
    if (isConstraintConflict(error, INVOICE_SUPPLIER_FK)) return new ValidationError('Supplier not found');
    if (isConstraintConflict(error, LINE_ITEM_FK)) {
      return new ValidationError('A PPE item on this invoice no longer exists. Reload the page and check the lines.');
    }
    return error;
  }
}
