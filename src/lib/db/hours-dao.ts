import { BaseDAO } from './base-dao';
import { HourRecord } from '@/types/database';
import { format } from 'date-fns';

export class HoursDAO extends BaseDAO<HourRecord> {
  constructor() {
    super('dbo.THour_Data_View');
  }

  private formatSQLDate(date: Date): string {
    // Create a new date object to avoid modifying the original
    const utcDate = new Date(date.getTime());
    // Convert to UTC string format for SQL Server
    return utcDate.toISOString().slice(0, 23).replace('T', ' ');
  }

  async getHoursByDateRange(startDate: Date, endDate: Date): Promise<HourRecord[]> {
    console.log('Captured startDate:', startDate);
    console.log('Captured endDate:', endDate);
    console.log('Formatted startDate:', this.formatSQLDate(startDate));
    console.log('Formatted endDate:', this.formatSQLDate(endDate));
    return this.executeQuery<HourRecord>(
      `SELECT * FROM ${this.tableName} 
       WHERE Work_Date >= @startDate AND Work_Date < @endDate
       ORDER BY Work_Date DESC`,
      { 
        startDate: this.formatSQLDate(startDate),
        endDate: this.formatSQLDate(endDate)
      }
    );
  }

  async getHoursByEmployee(employeeId: number): Promise<HourRecord[]> {
    return this.executeQuery<HourRecord>(
      `SELECT * FROM ${this.tableName} 
       WHERE Employee_ID_FK = @employeeId
       ORDER BY Work_Date DESC`,
      { employeeId }
    );
  }

  async getHoursByEmployeeAndDate(
    employeeId: number,
    startDate: Date,
    endDate: Date
  ): Promise<HourRecord[]> {
    return this.executeQuery<HourRecord>(
      `SELECT * FROM ${this.tableName} 
       WHERE Employee_ID_FK = @employeeId 
       AND Work_Date >= @startDate AND Work_Date < @endDate
       ORDER BY Work_Date DESC`,
      { 
        employeeId,
        startDate: this.formatSQLDate(startDate),
        endDate: this.formatSQLDate(endDate)
      }
    );
  }

  async getHoursByGrowerAndDate(
    growerId: number,
    startDate: Date,
    endDate: Date
  ): Promise<HourRecord[]> {
    console.log('Captured startDate:', startDate);
    console.log('Captured endDate:', endDate);
    console.log('Formatted startDate:', this.formatSQLDate(startDate));
    console.log('Formatted endDate:', this.formatSQLDate(endDate));
    return this.executeQuery<HourRecord>(
      `SELECT * FROM ${this.tableName} 
       WHERE Grower_ID = @growerId 
       AND Work_Date >= @startDate AND Work_Date < @endDate
       ORDER BY Work_Date DESC`,
      { 
        growerId,
        startDate: this.formatSQLDate(startDate),
        endDate: this.formatSQLDate(endDate)
      }
    );
  }

  async getHoursByGrowerEmployeeAndDate(
    growerId: number,
    employeeId: number,
    startDate: Date,
    endDate: Date
  ): Promise<HourRecord[]> {
    return this.executeQuery<HourRecord>(
      `SELECT * FROM ${this.tableName} 
       WHERE Grower_ID = @growerId 
       AND Employee_ID_FK = @employeeId
       AND Work_Date >= @startDate AND Work_Date < @endDate
       ORDER BY Work_Date DESC`,
      { 
        growerId,
        employeeId,
        startDate: this.formatSQLDate(startDate),
        endDate: this.formatSQLDate(endDate)
      }
    );
  }

  async addHourRecord(record: Omit<HourRecord, 'ID'>): Promise<HourRecord> {
    const result = await this.executeQuery<HourRecord>(
      `INSERT INTO dbo.THours (
        Work_Date, Hours_Worked, Employee_ID_FK, 
        Grower_ID, Overtime, PHoliday, 
        Sick_Leave
      ) VALUES (
        @workDate, @hoursWorked, @employeeId,
        @growerId, @overtime, @pHoliday,
        @sickLeave
      );
      SELECT SCOPE_IDENTITY() as ID;`,
      {
        workDate: record.Work_Date ? this.formatSQLDate(record.Work_Date) : null,
        hoursWorked: record.Hours_Worked,
        employeeId: record.Employee_ID_FK,
        growerId: record.Grower_ID,
        overtime: record.Overtime,
        pHoliday: record.PHoliday,
        sickLeave: record.Sick_Leave
      }
    );

    return {
      ID: result[0].ID,
      ...record
    };
  }

  async updateHourRecord(id: number, record: Partial<HourRecord>): Promise<void> {
    const updates = Object.entries(record)
      .filter(([key]) => key !== 'ID')
      .map(([key]) => `${key} = @${key}`)
      .join(', ');

    await this.executeQuery(
      `UPDATE dbo.THours 
       SET ${updates}
       WHERE ID = @id`,
      {
        ...record,
        id
      }
    );
  }

  async deleteHourRecord(id: number): Promise<void> {
    await this.executeQuery(
      'DELETE FROM dbo.THours WHERE ID = @id',
      { id }
    );
  }
} 