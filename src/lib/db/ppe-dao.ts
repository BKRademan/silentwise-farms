import { BaseDAO } from './base-dao';
import { isConstraintConflict } from './sql-errors';
import { ValidationError } from '@/lib/api-utils';
import { PPEItem, PPEItemWithUsage } from '@/types/database';

export interface PPEItemInput {
  PPE_Item: string;
  PPE_Item_Value: number;
}

export interface PPEItemReferences {
  issues: number;
  invoiceLines: number;
  adjustments: number;
}

const ITEM_REFERENCE_FKS = ['FK_TPPE_Invoice_Lines_Item', 'FK_TPPE_Stock_Adjustments_Item'];

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function itemInUseMessage(references?: PPEItemReferences): string {
  if (!references) return 'This item is used on invoices or stock adjustments and cannot be deleted';
  const uses = [
    references.issues > 0 && plural(references.issues, 'PPE issue'),
    references.invoiceLines > 0 && plural(references.invoiceLines, 'invoice line'),
    references.adjustments > 0 && plural(references.adjustments, 'stock adjustment'),
  ].filter((use): use is string => Boolean(use));
  const list = uses.length > 1 ? `${uses.slice(0, -1).join(', ')} and ${uses[uses.length - 1]}` : uses[0];
  return `This item is used on ${list}, so it cannot be deleted`;
}

export class PPEItemDAO extends BaseDAO<PPEItem> {
  constructor() {
    super('dbo.TPPE_Items');
  }

  async listWithUsage(): Promise<PPEItemWithUsage[]> {
    return this.executeQuery<PPEItemWithUsage>(
      `SELECT i.ID, i.PPE_Item, i.PPE_Item_Value,
              d.IssueCount, d.LastIssued,
              (SELECT COUNT(*) FROM dbo.TPPE_Invoice_Lines l WHERE l.PPE_Item_ID = i.ID) AS InvoiceLineCount,
              (SELECT COUNT(*) FROM dbo.TPPE_Stock_Adjustments a WHERE a.PPE_Item_ID = i.ID) AS AdjustmentCount
       FROM ${this.tableName} i
       OUTER APPLY (
         SELECT COUNT(*) AS IssueCount, MAX(x.Date) AS LastIssued
         FROM dbo.TDeductions x
         WHERE x.FK_PPE_Item = i.ID AND x.PPE IS NOT NULL
       ) d
       ORDER BY i.PPE_Item`
    );
  }

  async nameExists(name: string, excludeId?: number): Promise<boolean> {
    const rows = await this.executeQuery<{ ID: number }>(
      `SELECT ID FROM ${this.tableName}
       WHERE LOWER(LTRIM(RTRIM(PPE_Item))) = LOWER(@name)
         ${excludeId ? 'AND ID <> @excludeId' : ''}`,
      { name: name.trim(), ...(excludeId ? { excludeId } : {}) }
    );
    return rows.length > 0;
  }

  async add(input: PPEItemInput): Promise<{ ID: number }> {
    const result = await this.executeQuery<{ ID: number }>(
      `INSERT INTO ${this.tableName} (PPE_Item, PPE_Item_Value)
       VALUES (@name, @value);
       SELECT CAST(SCOPE_IDENTITY() AS int) AS ID;`,
      { name: input.PPE_Item.trim(), value: input.PPE_Item_Value }
    );
    return result[0];
  }

  async update(id: number, input: PPEItemInput): Promise<void> {
    await this.executeQuery(
      `UPDATE ${this.tableName} SET PPE_Item = @name, PPE_Item_Value = @value WHERE ID = @id`,
      { name: input.PPE_Item.trim(), value: input.PPE_Item_Value, id }
    );
  }

  async updatePrice(id: number, value: number): Promise<void> {
    const rows = await this.executeQuery<{ n: number }>(
      `UPDATE ${this.tableName} SET PPE_Item_Value = @value WHERE ID = @id;
       SELECT @@ROWCOUNT AS n;`,
      { value, id }
    );
    if (!rows[0]?.n) throw new ValidationError('PPE item not found');
  }

  async getReferences(id: number): Promise<PPEItemReferences> {
    const rows = await this.executeQuery<PPEItemReferences>(
      `SELECT
         (SELECT COUNT(*) FROM dbo.TDeductions WHERE FK_PPE_Item = @id) AS issues,
         (SELECT COUNT(*) FROM dbo.TPPE_Invoice_Lines WHERE PPE_Item_ID = @id) AS invoiceLines,
         (SELECT COUNT(*) FROM dbo.TPPE_Stock_Adjustments WHERE PPE_Item_ID = @id) AS adjustments`,
      { id }
    );
    return rows[0] ?? { issues: 0, invoiceLines: 0, adjustments: 0 };
  }

  /** Items referenced by issues, invoice lines or stock adjustments are kept for history. */
  async remove(id: number): Promise<void> {
    const references = await this.getReferences(id);
    if (references.issues + references.invoiceLines + references.adjustments > 0) {
      throw new ValidationError(itemInUseMessage(references));
    }
    try {
      await this.executeQuery(`DELETE FROM ${this.tableName} WHERE ID = @id`, { id });
    } catch (error) {
      if (ITEM_REFERENCE_FKS.some((fk) => isConstraintConflict(error, fk))) throw new ValidationError(itemInUseMessage());
      throw error;
    }
  }
}
