import { BaseDAO } from './base-dao';
import { PPEIssue } from '@/types/database';
import { addDaysToDateOnly, toSqlDateTimeStartOfDay } from '@/lib/date-time/south-africa';

export interface PPEIssueFilters {
  startDate: string;
  endDate: string;
  employeeId?: number;
  ppeItemId?: number;
}

export interface PPEIssueInput {
  Date: string;
  EmployeeID: number;
  PPEItemID: number;
  Amount: number;
}

/**
 * PPE issues live in `dbo.TDeductions` (the legacy `Loans` column is no longer captured).
 * `FK_Emp_ID` is nvarchar holding `TEmployee_Details.ID`, hence the TRY_CAST join.
 */
export class DeductionsDAO extends BaseDAO<PPEIssue> {
  constructor() {
    super('dbo.TDeductions');
  }

  async listPPEIssues({ startDate, endDate, employeeId, ppeItemId }: PPEIssueFilters): Promise<PPEIssue[]> {
    return this.executeQuery<PPEIssue>(
      `SELECT d.ID, d.Date, e.ID AS EmployeeID, e.EmplNo AS Employee,
              d.FK_PPE_Item AS PPEItemID, p.PPE_Item, CAST(d.PPE AS float) AS Amount
       FROM ${this.tableName} d
       LEFT JOIN dbo.TEmployee_Details e ON e.ID = TRY_CAST(d.FK_Emp_ID AS int)
       LEFT JOIN dbo.TPPE_Items p ON p.ID = d.FK_PPE_Item
       WHERE d.PPE IS NOT NULL
         AND d.Date >= CONVERT(datetime2, @startDate, 121)
         AND d.Date < CONVERT(datetime2, @endDate, 121)
         ${employeeId ? 'AND TRY_CAST(d.FK_Emp_ID AS int) = @employeeId' : ''}
         ${ppeItemId ? 'AND d.FK_PPE_Item = @ppeItemId' : ''}
       ORDER BY d.Date DESC, d.ID DESC`,
      {
        startDate: toSqlDateTimeStartOfDay(startDate),
        endDate: `${addDaysToDateOnly(endDate, 1)} 00:00:00.000`,
        ...(employeeId ? { employeeId } : {}),
        ...(ppeItemId ? { ppeItemId } : {}),
      }
    );
  }

  async addPPEIssue(input: PPEIssueInput): Promise<{ ID: number }> {
    const result = await this.executeQuery<{ ID: number }>(
      `INSERT INTO ${this.tableName} (PPE, Date, FK_Emp_ID, FK_PPE_Item)
       VALUES (@amount, CONVERT(datetime2, @date, 121), @employeeId, @ppeItemId);
       SELECT CAST(SCOPE_IDENTITY() AS int) AS ID;`,
      this.toParams(input)
    );
    return result[0];
  }

  async updatePPEIssue(id: number, input: PPEIssueInput): Promise<void> {
    await this.executeQuery(
      `UPDATE ${this.tableName}
       SET PPE = @amount,
           Date = CONVERT(datetime2, @date, 121),
           FK_Emp_ID = @employeeId,
           FK_PPE_Item = @ppeItemId
       WHERE ID = @id`,
      { ...this.toParams(input), id }
    );
  }

  async remove(id: number): Promise<void> {
    await this.executeQuery(`DELETE FROM ${this.tableName} WHERE ID = @id`, { id });
  }

  private toParams(input: PPEIssueInput) {
    return {
      amount: input.Amount,
      date: toSqlDateTimeStartOfDay(input.Date),
      employeeId: String(input.EmployeeID),
      ppeItemId: input.PPEItemID,
    };
  }
}
