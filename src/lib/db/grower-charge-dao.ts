import { BaseDAO, decimalParam } from './base-dao';
import { isConstraintConflict } from './sql-errors';
import { ValidationError } from '@/lib/api-utils';
import type { GrowerChargeInput } from '@/lib/validations/capture';
import type { PPEGrowerCharge } from '@/types/database';

export interface GrowerChargeFilters {
  startDate: string;
  endDate: string;
  growerId?: number;
}

const CHARGE_GROWER_FK = 'FK_TPPE_Grower_Charges_Grower';

/** PPE amounts invoiced on to growers (`TPPE_Grower_Charges`), excluding VAT. */
export class PPEGrowerChargeDAO extends BaseDAO<PPEGrowerCharge> {
  constructor() {
    super('dbo.TPPE_Grower_Charges');
  }

  async list({ startDate, endDate, growerId }: GrowerChargeFilters): Promise<PPEGrowerCharge[]> {
    return this.executeQuery<PPEGrowerCharge>(
      `SELECT c.ID, c.Grower_ID, g.GrowerName,
              CONVERT(char(10), c.Charge_Date, 23) AS Charge_Date,
              c.Reference, c.Amount_Excl_VAT, c.Notes
       FROM ${this.tableName} c
       LEFT JOIN dbo.TGrowers g ON g.ID = c.Grower_ID
       WHERE c.Charge_Date >= CONVERT(date, @startDate, 23)
         AND c.Charge_Date <= CONVERT(date, @endDate, 23)
         ${growerId ? 'AND c.Grower_ID = @growerId' : ''}
       ORDER BY c.Charge_Date DESC, c.ID DESC`,
      { startDate, endDate, ...(growerId ? { growerId } : {}) }
    );
  }

  async add(input: GrowerChargeInput): Promise<{ ID: number }> {
    await this.assertGrowerExists(input.Grower_ID);
    try {
      const rows = await this.executeQuery<{ ID: number }>(
        `INSERT INTO ${this.tableName} (Grower_ID, Charge_Date, Reference, Amount_Excl_VAT, Notes)
         OUTPUT INSERTED.ID
         VALUES (@growerId, CONVERT(date, @chargeDate, 23), @reference, @amount, @notes)`,
        this.toParams(input)
      );
      return rows[0];
    } catch (error) {
      throw this.toFriendlyError(error);
    }
  }

  async update(id: number, input: GrowerChargeInput): Promise<void> {
    await this.assertGrowerExists(input.Grower_ID);
    try {
      const rows = await this.executeQuery<{ n: number }>(
        `UPDATE ${this.tableName}
         SET Grower_ID = @growerId,
             Charge_Date = CONVERT(date, @chargeDate, 23),
             Reference = @reference,
             Amount_Excl_VAT = @amount,
             Notes = @notes
         WHERE ID = @id;
         SELECT @@ROWCOUNT AS n;`,
        { ...this.toParams(input), id }
      );
      if (!rows[0]?.n) throw new ValidationError('Grower charge not found');
    } catch (error) {
      throw this.toFriendlyError(error);
    }
  }

  async remove(id: number): Promise<void> {
    const rows = await this.executeQuery<{ n: number }>(
      `DELETE FROM ${this.tableName} WHERE ID = @id; SELECT @@ROWCOUNT AS n;`,
      { id }
    );
    if (!rows[0]?.n) throw new ValidationError('Grower charge not found');
  }

  private async assertGrowerExists(growerId: number): Promise<void> {
    const rows = await this.executeQuery<{ ID: number }>(`SELECT ID FROM dbo.TGrowers WHERE ID = @growerId`, { growerId });
    if (!rows[0]) throw new ValidationError('Grower not found');
  }

  private toParams(input: GrowerChargeInput) {
    return {
      growerId: input.Grower_ID,
      chargeDate: input.Charge_Date,
      reference: input.Reference,
      amount: decimalParam(input.Amount_Excl_VAT, 12),
      notes: input.Notes,
    };
  }

  private toFriendlyError(error: unknown): unknown {
    return isConstraintConflict(error, CHARGE_GROWER_FK) ? new ValidationError('Grower not found') : error;
  }
}
