import { BaseDAO } from './base-dao';
import { HourRecord } from '@/types/database';
import { addDaysToDateOnly, toSouthAfricaDateOnly, toSqlDateTimeStartOfDay } from '@/lib/date-time/south-africa';

export class HoursDAO extends BaseDAO<HourRecord> {
  constructor() {
    super('dbo.THour_Data_View');
  }

  private formatSQLDate(date: Date | string | null | undefined): string | null {
    const formatted = toSqlDateTimeStartOfDay(date);
    console.log('Formatting SA date:', { original: date, formatted });
    return formatted;
  }

  private formatExclusiveEndDate(date: Date | string): string {
    const dateOnly = toSouthAfricaDateOnly(date);
    if (!dateOnly) throw new Error('End date is required');
    return `${addDaysToDateOnly(dateOnly, 1)} 00:00:00.000`;
  }

  async getHoursByDateRange(start: Date | string, end: Date | string): Promise<HourRecord[]> {
    console.log('Querying hours between:', { start, end });
    try {
      const result = await this.executeQuery<HourRecord>(
        `SELECT * FROM ${this.tableName} 
         WHERE Work_Date >= CONVERT(datetime2, @start, 121)
           AND Work_Date < CONVERT(datetime2, @end, 121)
         ORDER BY Work_Date DESC`,
        { 
          start: this.formatSQLDate(start),
          end: this.formatExclusiveEndDate(end)
        }
      );
      return result;
    } catch (error) {
      console.error('Error in getHoursByDateRange:', error);
      throw error;
    }
  }

  async getHoursByEmployee(employeeId: number): Promise<HourRecord[]> {
    console.log('Getting hours by employee:', { employeeId });
    try {
      const result = await this.executeQuery<HourRecord>(
        `SELECT * FROM ${this.tableName} 
         WHERE Employee_ID_FK = @employeeId
         ORDER BY Work_Date DESC`,
        { employeeId }
      );
      console.log(`Found ${result.length} records for employee ${employeeId}`);
      return result;
    } catch (error) {
      console.error('Error in getHoursByEmployee:', error);
      throw error;
    }
  }

  async getHoursByEmployeeAndDate(
    employeeId: number,
    startDate: Date | string,
    endDate: Date | string
  ): Promise<HourRecord[]> {
    console.log('Getting hours by employee and date:', { employeeId, startDate, endDate });
    try {
      const result = await this.executeQuery<HourRecord>(
        `SELECT * FROM ${this.tableName} 
         WHERE Employee_ID_FK = @employeeId 
         AND Work_Date >= CONVERT(datetime2, @startDate, 121)
         AND Work_Date < CONVERT(datetime2, @endDate, 121)
         ORDER BY Work_Date DESC`,
        { 
          employeeId,
          startDate: this.formatSQLDate(startDate),
          endDate: this.formatExclusiveEndDate(endDate)
        }
      );
      console.log(`Found ${result.length} records for employee ${employeeId} in date range`);
      return result;
    } catch (error) {
      console.error('Error in getHoursByEmployeeAndDate:', error);
      throw error;
    }
  }

  async getHoursByGrowerAndDate(
    growerId: number,
    startDate: Date | string,
    endDate: Date | string
  ): Promise<HourRecord[]> {
    console.log('Getting hours by grower and date:', { growerId, startDate, endDate });
    try {
      const result = await this.executeQuery<HourRecord>(
        `SELECT * FROM ${this.tableName} 
         WHERE Grower_ID = @growerId 
         AND Work_Date >= CONVERT(datetime2, @startDate, 121)
         AND Work_Date < CONVERT(datetime2, @endDate, 121)
         ORDER BY Work_Date DESC`,
        { 
          growerId,
          startDate: this.formatSQLDate(startDate),
          endDate: this.formatExclusiveEndDate(endDate)
        }
      );
      console.log(`Found ${result.length} records for grower ${growerId} in date range`);
      return result;
    } catch (error) {
      console.error('Error in getHoursByGrowerAndDate:', error);
      throw error;
    }
  }

  async getHoursByGrowerEmployeeAndDate(
    growerId: number,
    employeeId: number,
    startDate: Date | string,
    endDate: Date | string
  ): Promise<HourRecord[]> {
    console.log('Getting hours by grower, employee and date:', { 
      growerId, employeeId, startDate, endDate 
    });
    try {
      const result = await this.executeQuery<HourRecord>(
        `SELECT * FROM ${this.tableName} 
         WHERE Grower_ID = @growerId 
         AND Employee_ID_FK = @employeeId
         AND Work_Date >= CONVERT(datetime2, @startDate, 121)
         AND Work_Date < CONVERT(datetime2, @endDate, 121)
         ORDER BY Work_Date DESC`,
        { 
          growerId,
          employeeId,
          startDate: this.formatSQLDate(startDate),
          endDate: this.formatExclusiveEndDate(endDate)
        }
      );
      console.log(`Found ${result.length} records for grower ${growerId} and employee ${employeeId} in date range`);
      return result;
    } catch (error) {
      console.error('Error in getHoursByGrowerEmployeeAndDate:', error);
      throw error;
    }
  }

  async addHourRecord(record: Omit<HourRecord, 'ID'>): Promise<HourRecord> {
    try {
      console.log('Starting addHourRecord with data:', {
        workDate: record.Work_Date,
        employeeId: record.Employee_ID_FK,
        growerId: record.Grower_ID,
        hoursWorked: record.Hours_Worked,
        overtime: record.Overtime,
        pHoliday: record.PHoliday,
        sickLeave: record.Sick_Leave
      });

      // First get the employee rate and grower details
      console.log('Fetching employee and grower details...');
      const [employeeRate, growerDetails] = await Promise.all([
        this.executeQuery<{ RATE: number }>(
          'SELECT RATE FROM dbo.TEmployee_Details WHERE ID = @employeeId',
          { employeeId: record.Employee_ID_FK }
        ).catch(error => {
          console.error('Failed to fetch employee rate:', error);
          throw new Error(`Failed to fetch employee rate: ${error.message}`);
        }),
        this.executeQuery<{ ManFee: number, HasManFee: boolean, ContPerc: number, HrsPerDay: number }>(
          'SELECT ManFee, HasManFee, ContPerc, HrsPerDay FROM dbo.TGrowers WHERE ID = @growerId',
          { growerId: record.Grower_ID }
        ).catch(error => {
          console.error('Failed to fetch grower details:', error);
          throw new Error(`Failed to fetch grower details: ${error.message}`);
        })
      ]);

      console.log('Retrieved data:', {
        employeeRate: employeeRate[0],
        growerDetails: growerDetails[0]
      });

      // Calculate the values
      const emp_rate = employeeRate[0]?.RATE || null;
      const man_fee = growerDetails[0]?.HasManFee ? (growerDetails[0]?.ManFee || null) : null;
      const con_tot = growerDetails[0]?.ContPerc || null;
      // Use nullish coalescing so 0 is a valid value (e.g. sick/PH-only rows)
      const hours_worked =
        record.Hours_Worked !== undefined && record.Hours_Worked !== null
          ? record.Hours_Worked
          : growerDetails[0]?.HrsPerDay ?? null;

      console.log('Calculated values:', {
        emp_rate,
        man_fee,
        con_tot,
        hours_worked,
        hasManFee: growerDetails[0]?.HasManFee,
        contPerc: growerDetails[0]?.ContPerc
      });

      // Ensure all values are properly typed as nullable
      const params = {
        workDate: record.Work_Date ? this.formatSQLDate(record.Work_Date) : null,
        hoursWorked: hours_worked,
        employeeId: record.Employee_ID_FK,
        growerId: record.Grower_ID,
        overtime: record.Overtime !== undefined && record.Overtime !== null ? record.Overtime : 0,
        pHoliday: record.PHoliday !== undefined && record.PHoliday !== null ? record.PHoliday : 0,
        sickLeave: record.Sick_Leave !== undefined && record.Sick_Leave !== null ? record.Sick_Leave : 0,
        empRate: emp_rate,
        conTot: con_tot,
        manFee: man_fee
      };

      console.log('Inserting hour record with params:', params);
      const result = await this.executeQuery<HourRecord>(
        `INSERT INTO dbo.THours (
          Work_Date, 
          Hours_Worked, 
          Employee_ID_FK, 
          Grower_ID, 
          Overtime, 
          PHoliday, 
          Sick_Leave, 
          Emp_Rate, 
          Con_Tot, 
          Man_Fee
        ) VALUES (
          CONVERT(datetime2, @workDate, 121),
          @hoursWorked,
          @employeeId,
          @growerId,
          @overtime,
          @pHoliday,
          @sickLeave,
          @empRate,
          @conTot,
          @manFee
        );
        SELECT SCOPE_IDENTITY() as ID;`,
        params
      ).catch(error => {
        console.error('Failed to insert hour record:', error);
        throw new Error(`Failed to insert hour record: ${error.message}`);
      });

      console.log('Successfully inserted hour record with ID:', result[0].ID);

      const newRecord = {
        ID: result[0].ID,
        Work_Date: record.Work_Date,
        Hours_Worked: hours_worked,
        Employee_ID_FK: record.Employee_ID_FK,
        Employee: null, // Will be populated by the view
        Grower_ID: record.Grower_ID,
        GrowerName: null, // Will be populated by the view
        Overtime: record.Overtime || null,
        PHoliday: record.PHoliday || null,
        Emp_Rate: emp_rate,
        Con_Tot: con_tot,
        Man_Fee: man_fee,
        Sick_Leave: record.Sick_Leave || null
      };

      console.log('Returning new record:', newRecord);
      return newRecord;
    } catch (error) {
      console.error('Error in addHourRecord:', error);
      throw error;
    }
  }

  async updateHourRecord(id: number, record: Partial<HourRecord>): Promise<void> {
    console.log('Updating hour record:', { id, updates: record });
    try {
      const updates = Object.entries(record)
        .filter(([key]) => key !== 'ID')
        .map(([key]) => (
          key === 'Work_Date'
            ? `${key} = CONVERT(datetime2, @${key}, 121)`
            : `${key} = @${key}`
        ))
        .join(', ');

      console.log('Generated update SQL:', updates);

      const normalizedRecord = {
        ...record,
        Work_Date: record.Work_Date ? this.formatSQLDate(record.Work_Date) : record.Work_Date,
      };

      await this.executeQuery(
        `UPDATE dbo.THours 
         SET ${updates}
         WHERE ID = @id`,
        {
          ...normalizedRecord,
          id
        }
      );
      console.log('Successfully updated hour record:', id);
    } catch (error) {
      console.error('Error in updateHourRecord:', error);
      throw error;
    }
  }

  async deleteHourRecord(id: number): Promise<void> {
    console.log('Deleting hour record:', id);
    try {
      await this.executeQuery(
        'DELETE FROM dbo.THours WHERE ID = @id',
        { id }
      );
      console.log('Successfully deleted hour record:', id);
    } catch (error) {
      console.error('Error in deleteHourRecord:', error);
      throw error;
    }
  }

  async checkEmployeeRecordExists(employeeId: number, workDate: Date | string, recordId?: number): Promise<boolean> {
    console.log('Checking if employee record exists:', { employeeId, workDate, recordId });
    try {
      // Format the date for SQL query
      const formattedDate = this.formatSQLDate(workDate);
      
      // Build the query - include the recordId check to exclude the current record when editing
      let query = `
        SELECT COUNT(*) as count 
        FROM dbo.THours 
        WHERE Employee_ID_FK = @employeeId 
        AND CONVERT(date, Work_Date) = CONVERT(date, @workDate, 121)`;
      
      const params: any = { 
        employeeId, 
        workDate: formattedDate 
      };

      // If recordId is provided (when editing), exclude that record from the check
      if (recordId) {
        query += ' AND ID <> @recordId';
        params.recordId = recordId;
      }

      const result = await this.executeQuery<{ count: number }>(query, params);
      
      const exists = result[0]?.count > 0;
      console.log(`Employee ${employeeId} record on ${formattedDate} exists: ${exists}`);
      return exists;
    } catch (error) {
      console.error('Error checking if employee record exists:', error);
      throw error;
    }
  }
} 