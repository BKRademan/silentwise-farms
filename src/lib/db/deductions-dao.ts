import { BaseDAO } from './base-dao';
import { Deduction } from '@/types/database';

export class DeductionsDAO extends BaseDAO<Deduction> {
  constructor() {
    super('dbo.TDeductions');
  }

  async getDeductionsByEmployee(employeeId: string): Promise<Deduction[]> {
    return this.executeQuery<Deduction>(
      `SELECT d.*, p.PPE_Item, e.Employee 
       FROM ${this.tableName} d
       LEFT JOIN dbo.TPPE_Items p ON d.FK_PPE_Item = p.ID
       LEFT JOIN dbo.TEmployee_Details e ON d.FK_Emp_ID = e.ID
       WHERE d.FK_Emp_ID = @employeeId
       ORDER BY d.Date DESC`,
      { employeeId }
    );
  }

  async getDeductionsByDateRange(startDate: Date, endDate: Date): Promise<Deduction[]> {
    return this.executeQuery<Deduction>(
      `SELECT d.*, p.PPE_Item, e.Employee 
       FROM ${this.tableName} d
       LEFT JOIN dbo.TPPE_Items p ON d.FK_PPE_Item = p.ID
       LEFT JOIN dbo.TEmployee_Details e ON d.FK_Emp_ID = e.ID
       WHERE d.Date BETWEEN @startDate AND @endDate
       ORDER BY d.Date DESC`,
      { startDate, endDate }
    );
  }

  async addDeduction(deduction: Omit<Deduction, 'ID'>): Promise<Deduction> {
    const result = await this.executeQuery<Deduction>(
      `INSERT INTO ${this.tableName} (
        Loans, PPE, Date,
        FK_Emp_ID, FK_PPE_Item
      ) VALUES (
        @loans, @ppe, @date,
        @employeeId, @ppeItemId
      );
      SELECT SCOPE_IDENTITY() as ID;`,
      {
        loans: deduction.Loans,
        ppe: deduction.PPE,
        date: deduction.Date,
        employeeId: deduction.FK_Emp_ID,
        ppeItemId: deduction.FK_PPE_Item
      }
    );

    return {
      ID: result[0].ID,
      ...deduction
    };
  }

  async updateDeduction(id: number, deduction: Partial<Deduction>): Promise<void> {
    const updates = Object.entries(deduction)
      .filter(([key]) => key !== 'ID')
      .map(([key]) => `${key} = @${key}`)
      .join(', ');

    await this.executeQuery(
      `UPDATE ${this.tableName} 
       SET ${updates}
       WHERE ID = @id`,
      {
        ...deduction,
        id
      }
    );
  }

  async deleteDeduction(id: number): Promise<void> {
    await this.executeQuery(
      `DELETE FROM ${this.tableName} WHERE ID = @id`,
      { id }
    );
  }

  async getDeductionSummaryByEmployee(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ totalLoans: number; totalPPE: number }> {
    const result = await this.executeQuery<{ totalLoans: number; totalPPE: number }>(
      `SELECT 
        SUM(Loans) as totalLoans,
        SUM(PPE) as totalPPE
       FROM ${this.tableName}
       WHERE FK_Emp_ID = @employeeId
       AND Date BETWEEN @startDate AND @endDate`,
      { employeeId, startDate, endDate }
    );

    return result[0] || { totalLoans: 0, totalPPE: 0 };
  }

  async getDeductionsByPPEItem(ppeItemId: number): Promise<Deduction[]> {
    return this.executeQuery<Deduction>(
      `SELECT d.*, p.PPE_Item, e.Employee 
       FROM ${this.tableName} d
       LEFT JOIN dbo.TPPE_Items p ON d.FK_PPE_Item = p.ID
       LEFT JOIN dbo.TEmployee_Details e ON d.FK_Emp_ID = e.ID
       WHERE d.FK_PPE_Item = @ppeItemId
       ORDER BY d.Date DESC`,
      { ppeItemId }
    );
  }
} 