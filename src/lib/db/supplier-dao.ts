import { BaseDAO } from './base-dao';
import { isConstraintConflict, isUniqueViolation } from './sql-errors';
import { ValidationError } from '@/lib/api-utils';
import type { SupplierInput } from '@/lib/validations/capture';
import type { PPESupplier, PPESupplierWithUsage } from '@/types/database';

const SUPPLIER_NAME_UNIQUE = 'UQ_TPPE_Suppliers_Name';
const INVOICE_SUPPLIER_FK = 'FK_TPPE_Invoices_Supplier';

function duplicateNameMessage(name: string): string {
  return `A supplier called "${name}" already exists`;
}

function supplierInUseMessage(invoiceCount?: number): string {
  const invoices = invoiceCount ? `${invoiceCount} invoice${invoiceCount === 1 ? '' : 's'}` : 'invoices';
  return `This supplier has ${invoices} and cannot be deleted. Deactivate the supplier instead.`;
}

export class PPESupplierDAO extends BaseDAO<PPESupplier> {
  constructor() {
    super('dbo.TPPE_Suppliers');
  }

  async listWithUsage(): Promise<PPESupplierWithUsage[]> {
    return this.executeQuery<PPESupplierWithUsage>(
      `SELECT s.ID, s.Supplier_Name, s.Contact_Details, s.Is_Active,
              COUNT(i.ID) AS InvoiceCount,
              CONVERT(char(10), MAX(i.Invoice_Date), 23) AS LastInvoiceDate
       FROM ${this.tableName} s
       LEFT JOIN dbo.TPPE_Invoices i ON i.Supplier_ID = s.ID
       GROUP BY s.ID, s.Supplier_Name, s.Contact_Details, s.Is_Active
       ORDER BY s.Is_Active DESC, s.Supplier_Name`
    );
  }

  async add(input: SupplierInput): Promise<{ ID: number }> {
    await this.assertNameAvailable(input.Supplier_Name);
    try {
      const rows = await this.executeQuery<{ ID: number }>(
        `INSERT INTO ${this.tableName} (Supplier_Name, Contact_Details, Is_Active)
         OUTPUT INSERTED.ID
         VALUES (@name, @contact, @isActive)`,
        { name: input.Supplier_Name, contact: input.Contact_Details, isActive: input.Is_Active ?? true }
      );
      return rows[0];
    } catch (error) {
      throw isUniqueViolation(error, SUPPLIER_NAME_UNIQUE) ? new ValidationError(duplicateNameMessage(input.Supplier_Name)) : error;
    }
  }

  async update(id: number, input: SupplierInput): Promise<void> {
    await this.assertNameAvailable(input.Supplier_Name, id);
    try {
      const rows = await this.executeQuery<{ n: number }>(
        `UPDATE ${this.tableName}
         SET Supplier_Name = @name,
             Contact_Details = @contact,
             Is_Active = COALESCE(@isActive, Is_Active)
         WHERE ID = @id;
         SELECT @@ROWCOUNT AS n;`,
        { id, name: input.Supplier_Name, contact: input.Contact_Details, isActive: input.Is_Active ?? null }
      );
      if (!rows[0]?.n) throw new ValidationError('Supplier not found');
    } catch (error) {
      throw isUniqueViolation(error, SUPPLIER_NAME_UNIQUE) ? new ValidationError(duplicateNameMessage(input.Supplier_Name)) : error;
    }
  }

  /** Suppliers with invoices are kept for history; the FK backs up the count check against races. */
  async remove(id: number): Promise<void> {
    const usage = await this.executeQuery<{ n: number }>(
      `SELECT COUNT(*) AS n FROM dbo.TPPE_Invoices WHERE Supplier_ID = @id`,
      { id }
    );
    const invoiceCount = usage[0]?.n ?? 0;
    if (invoiceCount > 0) throw new ValidationError(supplierInUseMessage(invoiceCount));

    try {
      const rows = await this.executeQuery<{ n: number }>(
        `DELETE FROM ${this.tableName} WHERE ID = @id; SELECT @@ROWCOUNT AS n;`,
        { id }
      );
      if (!rows[0]?.n) throw new ValidationError('Supplier not found');
    } catch (error) {
      throw isConstraintConflict(error, INVOICE_SUPPLIER_FK) ? new ValidationError(supplierInUseMessage()) : error;
    }
  }

  private async assertNameAvailable(name: string, excludeId?: number): Promise<void> {
    const rows = await this.executeQuery<{ ID: number }>(
      `SELECT ID FROM ${this.tableName} WHERE Supplier_Name = @name ${excludeId ? 'AND ID <> @excludeId' : ''}`,
      { name, ...(excludeId ? { excludeId } : {}) }
    );
    if (rows.length > 0) throw new ValidationError(duplicateNameMessage(name));
  }
}
