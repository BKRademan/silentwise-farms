import { BaseDAO, decimalParam } from './base-dao';
import { isConstraintConflict } from './sql-errors';
import { ValidationError } from '@/lib/api-utils';
import { PPE_STOCK_TRACKING_START } from '@/lib/constants/ppe';
import { toSqlDateTimeStartOfDay } from '@/lib/date-time/south-africa';
import type { StockAdjustmentInput } from '@/lib/validations/capture';
import type { PPEStockAdjustment, PPEStockLevel } from '@/types/database';

const ADJUSTMENT_ITEM_FK = 'FK_TPPE_Stock_Adjustments_Item';
const RECENT_ADJUSTMENT_LIMIT = 200;

/**
 * Stock on hand per item = adjustments + quantity purchased − quantity issued, counting only
 * rows dated on or after `PPE_STOCK_TRACKING_START`. Each PPE row in `TDeductions` is one unit issued.
 */
export class PPEStockDAO extends BaseDAO<PPEStockAdjustment> {
  constructor() {
    super('dbo.TPPE_Stock_Adjustments');
  }

  async listStockLevels(): Promise<PPEStockLevel[]> {
    return this.executeQuery<PPEStockLevel>(
      `SELECT i.ID, i.PPE_Item, m.Adjustments, m.Purchased, m.Issued,
              m.Adjustments + m.Purchased - m.Issued AS OnHand
       FROM dbo.TPPE_Items i
       CROSS APPLY (
         SELECT
           COALESCE((SELECT SUM(a.Quantity) FROM ${this.tableName} a
                     WHERE a.PPE_Item_ID = i.ID
                       AND a.Adjustment_Date >= CONVERT(date, @startDate, 23)), 0) AS Adjustments,
           COALESCE((SELECT SUM(l.Quantity) FROM dbo.TPPE_Invoice_Lines l
                     INNER JOIN dbo.TPPE_Invoices v ON v.ID = l.Invoice_ID
                     WHERE l.PPE_Item_ID = i.ID
                       AND v.Invoice_Date >= CONVERT(date, @startDate, 23)), 0) AS Purchased,
           CAST((SELECT COUNT(*) FROM dbo.TDeductions d
                 WHERE d.FK_PPE_Item = i.ID
                   AND d.PPE IS NOT NULL
                   AND d.Date >= CONVERT(datetime2, @startDateTime, 121)) AS decimal(12, 2)) AS Issued
       ) m
       ORDER BY i.PPE_Item`,
      { startDate: PPE_STOCK_TRACKING_START, startDateTime: toSqlDateTimeStartOfDay(PPE_STOCK_TRACKING_START) }
    );
  }

  async listAdjustments(ppeItemId?: number): Promise<PPEStockAdjustment[]> {
    return this.executeQuery<PPEStockAdjustment>(
      `SELECT TOP (${RECENT_ADJUSTMENT_LIMIT})
              a.ID, a.PPE_Item_ID, p.PPE_Item,
              CONVERT(char(10), a.Adjustment_Date, 23) AS Adjustment_Date,
              a.Quantity, a.Reason, a.Notes
       FROM ${this.tableName} a
       LEFT JOIN dbo.TPPE_Items p ON p.ID = a.PPE_Item_ID
       ${ppeItemId ? 'WHERE a.PPE_Item_ID = @ppeItemId' : ''}
       ORDER BY a.Adjustment_Date DESC, a.ID DESC`,
      ppeItemId ? { ppeItemId } : undefined
    );
  }

  async addAdjustment(input: StockAdjustmentInput): Promise<{ ID: number }> {
    await this.assertItemExists(input.PPE_Item_ID);
    try {
      const rows = await this.executeQuery<{ ID: number }>(
        `INSERT INTO ${this.tableName} (PPE_Item_ID, Adjustment_Date, Quantity, Reason, Notes)
         OUTPUT INSERTED.ID
         VALUES (@itemId, CONVERT(date, @adjustmentDate, 23), @quantity, @reason, @notes)`,
        this.toParams(input)
      );
      return rows[0];
    } catch (error) {
      throw this.toFriendlyError(error);
    }
  }

  async updateAdjustment(id: number, input: StockAdjustmentInput): Promise<void> {
    await this.assertItemExists(input.PPE_Item_ID);
    try {
      const rows = await this.executeQuery<{ n: number }>(
        `UPDATE ${this.tableName}
         SET PPE_Item_ID = @itemId,
             Adjustment_Date = CONVERT(date, @adjustmentDate, 23),
             Quantity = @quantity,
             Reason = @reason,
             Notes = @notes
         WHERE ID = @id;
         SELECT @@ROWCOUNT AS n;`,
        { ...this.toParams(input), id }
      );
      if (!rows[0]?.n) throw new ValidationError('Stock adjustment not found');
    } catch (error) {
      throw this.toFriendlyError(error);
    }
  }

  async removeAdjustment(id: number): Promise<void> {
    const rows = await this.executeQuery<{ n: number }>(
      `DELETE FROM ${this.tableName} WHERE ID = @id; SELECT @@ROWCOUNT AS n;`,
      { id }
    );
    if (!rows[0]?.n) throw new ValidationError('Stock adjustment not found');
  }

  private async assertItemExists(itemId: number): Promise<void> {
    const rows = await this.executeQuery<{ ID: number }>(`SELECT ID FROM dbo.TPPE_Items WHERE ID = @itemId`, { itemId });
    if (!rows[0]) throw new ValidationError('PPE item not found');
  }

  private toParams(input: StockAdjustmentInput) {
    return {
      itemId: input.PPE_Item_ID,
      adjustmentDate: input.Adjustment_Date,
      quantity: decimalParam(input.Quantity, 10),
      reason: input.Reason,
      notes: input.Notes,
    };
  }

  private toFriendlyError(error: unknown): unknown {
    return isConstraintConflict(error, ADJUSTMENT_ITEM_FK) ? new ValidationError('PPE item not found') : error;
  }
}
