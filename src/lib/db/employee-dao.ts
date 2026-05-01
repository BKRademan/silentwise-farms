import { BaseDAO } from './base-dao';
import { Employee } from '@/types/database';
import { toSqlDateOnly } from '@/lib/date-time/south-africa';

interface EmployeeWithLastWorked extends Employee {
  lastWorkedDate: Date | null;
  fullName?: string;
}

export type EmployeeDetailsExportRow = Record<
  string,
  string | number | Date | null
>;

const DATE_COLUMNS = new Set<keyof Employee>([
  'DateOfBirth',
  'DateEngaged',
  'LastDateWorked',
  'TaxYearStart',
  'UIFEndDate',
  'NewUIFStartDate',
  'Date_Registered',
]);

const READ_ONLY_COLUMNS = new Set<keyof Employee>([
  'Language',
  'MaritalStatus',
  'BusinessNUmber',
  'TaxStatus',
  'UIFStatus',
  'NewUIFStartDate',
  'HrsPerPeriod',
  'HoursPerDay',
  'WorkAddressCode',
  'RepAddr1',
  'RepAddr2',
  'RepAddr3',
  'RepPostCode',
  'ResidentialCountry',
  'LinkPostalTo',
  'FullNames',
]);

export class EmployeeDAO extends BaseDAO<Employee> {
  constructor() {
    super('dbo.TEmployee_Details');
  }

  private formatSQLDate(date: Date | string | null | undefined): string | null {
    return toSqlDateOnly(date);
  }

  async findAll(): Promise<Employee[]> {
    try {
      console.log('Fetching all employees...');
      const result = await this.executeQuery<Employee>(
        `SELECT * FROM ${this.tableName} 
         ORDER BY LastName, FirstName`
      );
      console.log(`Found ${result.length} employees`);
      return result;
    } catch (error) {
      console.error('Error in findAll employees:', error);
      throw error;
    }
  }

  async findByName(name: string): Promise<Employee[]> {
    try {
      console.log('Finding employees by name:', name);
      const result = await this.executeQuery<Employee>(
        `SELECT * FROM ${this.tableName} 
         WHERE EmplNo LIKE @name 
         OR LastName LIKE @name 
         OR FirstName LIKE @name 
         OR knownAs LIKE @name
         ORDER BY LastName, FirstName`,
        { name: `%${name}%` }
      );
      console.log(`Found ${result.length} employees matching name:`, name);
      return result;
    } catch (error) {
      console.error('Error in findByName:', error);
      throw error;
    }
  }

  async findActive(): Promise<Employee[]> {
    try {
      console.log('Finding active employees...');
      const result = await this.executeQuery<Employee>(
        `SELECT 
          ID,
          EmplNo,
          LastName,
          FirstName,
          knownAs,
          RATE,
          IDNumber,
          DateEngaged
         FROM ${this.tableName} 
         ORDER BY LastName, FirstName`
      );
      console.log(`Found ${result.length} active employees`);
      return result;
    } catch (error) {
      console.error('Error in findActive:', error);
      throw error;
    }
  }

  /**
   * Find another row with the same SA ID number (for duplicate checks).
   */
  async findByIdNumber(
    idNumber: string,
    excludeId?: number
  ): Promise<Employee | null> {
    const trimmed = idNumber.trim();
    if (!trimmed) return null;
    const sql =
      excludeId != null
        ? `SELECT TOP 1 * FROM ${this.tableName} 
           WHERE IDNumber = @idNumber AND ID <> @excludeId`
        : `SELECT TOP 1 * FROM ${this.tableName} 
           WHERE IDNumber = @idNumber`;
    const params =
      excludeId != null
        ? { idNumber: trimmed, excludeId }
        : { idNumber: trimmed };
    const rows = await this.executeQuery<Employee>(sql, params);
    return rows[0] ?? null;
  }

  async addEmployee(employee: Omit<Employee, 'ID'>): Promise<Employee> {
    try {
      console.log('Adding new employee (full row)');
      const p = this.buildInsertParams(employee);
      const result = await this.executeQuery<Employee>(
        `INSERT INTO ${this.tableName} (
          EmplNo, FirstName, LastName, Initials, SecondName, knownAs, Title, IDNumber,
          DateOfBirth, DateEngaged, LastDateWorked, EthnicGroup, Gender,
          CellNumber, AlternativeNumber, TaxNumber,
          TaxYearStart, UIFEndDate, PayMethod, BankAccType, BankAccNo, BranchCode, BankName, AccHolder, AccRelationship,
          ResUnit, ResComplex, ResStreetNo, ResStreetName, ResSuburb, ResCity, ResPostCode,
          RATE, Date_Registered
        )
        OUTPUT INSERTED.*
        VALUES (
          @EmplNo, @FirstName, @LastName, @Initials, @SecondName, @knownAs, @Title, @IDNumber,
          CONVERT(date, @DateOfBirth, 23), CONVERT(date, @DateEngaged, 23), CONVERT(date, @LastDateWorked, 23),
          @EthnicGroup, @Gender,
          @CellNumber, @AlternativeNumber, @TaxNumber,
          CONVERT(date, @TaxYearStart, 23), CONVERT(date, @UIFEndDate, 23),
          @PayMethod, @BankAccType, @BankAccNo, @BranchCode, @BankName, @AccHolder, @AccRelationship,
          @ResUnit, @ResComplex, @ResStreetNo, @ResStreetName, @ResSuburb, @ResCity, @ResPostCode,
          @RATE, CONVERT(date, @Date_Registered, 23)
        )`,
        p
      );
      const inserted = result[0];
      if (!inserted) throw new Error('Insert did not return a row');
      console.log('Successfully added employee ID:', inserted.ID);
      return inserted;
    } catch (error) {
      console.error('Error in addEmployee:', error);
      throw error;
    }
  }

  private buildInsertParams(employee: Omit<Employee, 'ID'>): Record<string, unknown> {
    const d = (v: Date | string | null | undefined) =>
      v === null || v === undefined ? null : this.formatSQLDate(v);
    return {
      EmplNo: employee.EmplNo,
      FirstName: employee.FirstName,
      LastName: employee.LastName,
      Initials: employee.Initials,
      SecondName: employee.SecondName,
      knownAs: employee.knownAs,
      Title: employee.Title,
      IDNumber: employee.IDNumber,
      DateOfBirth: d(employee.DateOfBirth),
      DateEngaged: d(employee.DateEngaged),
      LastDateWorked: d(employee.LastDateWorked),
      Language: employee.Language,
      EthnicGroup: employee.EthnicGroup,
      Gender: employee.Gender,
      MaritalStatus: employee.MaritalStatus,
      CellNumber: employee.CellNumber,
      BusinessNUmber: employee.BusinessNUmber,
      AlternativeNumber: employee.AlternativeNumber,
      TaxNumber: employee.TaxNumber,
      TaxStatus: employee.TaxStatus,
      UIFStatus: employee.UIFStatus,
      TaxYearStart: d(employee.TaxYearStart),
      UIFEndDate: d(employee.UIFEndDate),
      NewUIFStartDate: d(employee.NewUIFStartDate),
      PayMethod: employee.PayMethod,
      BankAccType: employee.BankAccType,
      BankAccNo: employee.BankAccNo,
      BranchCode: employee.BranchCode,
      BankName: employee.BankName,
      AccHolder: employee.AccHolder,
      AccRelationship: employee.AccRelationship,
      HrsPerPeriod: employee.HrsPerPeriod,
      HoursPerDay: employee.HoursPerDay,
      WorkAddressCode: employee.WorkAddressCode,
      RepAddr1: employee.RepAddr1,
      RepAddr2: employee.RepAddr2,
      RepAddr3: employee.RepAddr3,
      RepPostCode: employee.RepPostCode,
      ResUnit: employee.ResUnit,
      ResComplex: employee.ResComplex,
      ResStreetNo: employee.ResStreetNo,
      ResStreetName: employee.ResStreetName,
      ResSuburb: employee.ResSuburb,
      ResCity: employee.ResCity,
      ResPostCode: employee.ResPostCode,
      ResidentialCountry: employee.ResidentialCountry,
      LinkPostalTo: employee.LinkPostalTo,
      FullNames: employee.FullNames,
      RATE: employee.RATE,
      Date_Registered: d(employee.Date_Registered),
    };
  }

  async updateEmployee(id: number, employee: Partial<Employee>): Promise<void> {
    try {
      const entries = Object.entries(employee).filter(
        ([key, val]) =>
          key !== 'ID' &&
          val !== undefined &&
          !READ_ONLY_COLUMNS.has(key as keyof Employee)
      ) as [keyof Employee, unknown][];

      if (entries.length === 0) {
        console.log('No fields to update for employee:', id);
        return;
      }

      const sets = entries
        .map(([key, val]) => {
          if (DATE_COLUMNS.has(key)) {
            if (val === null) return `${String(key)} = NULL`;
            return `${String(key)} = CONVERT(date, @${String(key)}, 23)`;
          }
          return `${String(key)} = @${String(key)}`;
        })
        .join(', ');

      const params: Record<string, unknown> = { id };
      for (const [key, val] of entries) {
        if (DATE_COLUMNS.has(key)) {
          params[String(key)] =
            val === null ? null : this.formatSQLDate(val as Date | string);
        } else {
          params[String(key)] = val;
        }
      }

      console.log('Updating employee:', { id, fields: entries.map(([k]) => k) });

      await this.executeQuery(
        `UPDATE ${this.tableName} 
         SET ${sets}
         WHERE ID = @id`,
        params
      );
      console.log('Successfully updated employee:', id);
    } catch (error) {
      console.error('Error in updateEmployee:', error);
      throw error;
    }
  }

  async getDeletionBlockReasons(id: number): Promise<string[]> {
    const rows = await this.executeQuery<{
      hoursCount: number;
      scheduleCount: number;
      deductionCount: number;
    }>(
      `SELECT 
        (SELECT COUNT(*) FROM dbo.THour_Data_View WHERE Employee_ID_FK = @id) AS hoursCount,
        (SELECT COUNT(*) FROM dbo.TScheduleEmployee WHERE Employee_ID = @id) AS scheduleCount,
        (SELECT COUNT(*) FROM dbo.TDeductions WHERE FK_Emp_ID = @id) AS deductionCount`,
      { id }
    );
    const r = rows[0];
    if (!r) return [];
    const reasons: string[] = [];
    if (r.hoursCount > 0) {
      reasons.push(
        `Cannot delete: employee has ${r.hoursCount} hour record(s) in history.`
      );
    }
    if (r.scheduleCount > 0) {
      reasons.push(
        `Cannot delete: employee is on ${r.scheduleCount} schedule(s).`
      );
    }
    if (r.deductionCount > 0) {
      reasons.push(
        `Cannot delete: employee has ${r.deductionCount} deduction record(s).`
      );
    }
    return reasons;
  }

  async deleteEmployee(id: number): Promise<void> {
    const reasons = await this.getDeletionBlockReasons(id);
    if (reasons.length > 0) {
      throw new Error(reasons.join(' '));
    }
    await this.executeQuery(`DELETE FROM ${this.tableName} WHERE ID = @id`, {
      id,
    });
  }

  async getEmployeesByGrowerAndDate(
    growerId: number,
    date: Date | string
  ): Promise<Employee[]> {
    try {
      console.log('Getting employees by grower and date:', { growerId, date });
      const result = await this.executeQuery<Employee>(
        `SELECT DISTINCT e.* 
         FROM ${this.tableName} e
         INNER JOIN dbo.THour_Data_View h ON e.ID = h.Employee_ID_FK
         WHERE h.Grower_ID = @growerId 
         AND CAST(h.Work_Date AS DATE) = CONVERT(date, @date, 23)
         ORDER BY e.LastName, e.FirstName`,
        { growerId, date: this.formatSQLDate(date) }
      );
      console.log(
        `Found ${result.length} employees for grower ${growerId} on date ${date}`
      );
      return result;
    } catch (error) {
      console.error('Error in getEmployeesByGrowerAndDate:', error);
      throw error;
    }
  }

  async findAllWithLastWorkedDate(): Promise<EmployeeWithLastWorked[]> {
    try {
      console.log('Fetching all employees with last worked date...');
      const result = await this.executeQuery<EmployeeWithLastWorked>(
        `SELECT 
          e.ID, 
          e.EmplNo, 
          ISNULL(e.LastName, '') as LastName, 
          ISNULL(e.FirstName, '') as FirstName, 
          ISNULL(e.knownAs, '') as knownAs, 
          e.RATE, 
          ISNULL(e.IDNumber, '') as IDNumber, 
          e.DateEngaged,
          ISNULL(e.BankName, '') as BankName,
          ISNULL(e.BranchCode, '') as BranchCode,
          ISNULL(e.AccHolder, '') as AccHolder,
          ISNULL(e.BankAccNo, '') as BankAccNo,
          (SELECT TOP 1 h.Work_Date 
           FROM dbo.THour_Data_View h 
           WHERE h.Employee_ID_FK = e.ID 
           ORDER BY h.Work_Date DESC) as lastWorkedDate
        FROM ${this.tableName} e
        ORDER BY e.LastName, e.FirstName`
      );

      if (result.length > 0) {
        console.log('Sample employee record:', JSON.stringify(result[0]));
      }

      const formattedResults = result.map((emp) => {
        const nameStr = `${emp.FirstName || ''} ${emp.LastName || ''}`.trim();
        const fullName = nameStr || '-';

        return {
          ...emp,
          LastName: emp.LastName || '',
          FirstName: emp.FirstName || '',
          fullName,
          knownAs: emp.knownAs || '',
          IDNumber: emp.IDNumber || '',
          BankName: emp.BankName || '',
          BranchCode: emp.BranchCode || '',
          AccHolder: emp.AccHolder || '',
          BankAccNo: emp.BankAccNo || '',
        };
      });

      if (formattedResults.length > 0) {
        console.log(
          'Sample formatted record:',
          JSON.stringify(formattedResults[0])
        );
      }

      console.log(
        `Found ${formattedResults.length} employees with last worked dates`
      );
      return formattedResults;
    } catch (error) {
      console.error('Error in findAllWithLastWorkedDate:', error);
      throw error;
    }
  }

  async findByIdWithDetails(id: number): Promise<EmployeeWithLastWorked | null> {
    try {
      console.log(`Fetching employee details for ID: ${id}`);
      const result = await this.executeQuery<EmployeeWithLastWorked>(
        `SELECT e.*,
          (SELECT TOP 1 h.Work_Date 
           FROM dbo.THour_Data_View h 
           WHERE h.Employee_ID_FK = e.ID 
           ORDER BY h.Work_Date DESC) as lastWorkedDate
        FROM ${this.tableName} e
        WHERE e.ID = @id`,
        { id }
      );

      if (result.length === 0) {
        console.log(`No employee found with ID: ${id}`);
        return null;
      }

      const row = result[0];
      const nameStr = `${row.FirstName || ''} ${row.LastName || ''}`.trim();
      const fullName = nameStr || '-';

      const employee = {
        ...row,
        LastName: row.LastName || '',
        FirstName: row.FirstName || '',
        fullName,
        knownAs: row.knownAs || '',
        IDNumber: row.IDNumber || '',
        BankName: row.BankName || '',
        BranchCode: row.BranchCode || '',
        AccHolder: row.AccHolder || '',
        BankAccNo: row.BankAccNo || '',
      };

      console.log(`Found employee details for ID: ${id}`);
      return employee;
    } catch (error) {
      console.error(`Error in findByIdWithDetails for ID: ${id}:`, error);
      throw error;
    }
  }

  async refreshTaxYearStartForAllEmployees(): Promise<number> {
    try {
      console.log('Refreshing TaxYearStart for all employees...');
      const result = await this.executeQuery<{ rowsAffected: number }>(
        `DECLARE @today date = CAST(SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'South Africa Standard Time' AS date);
         DECLARE @taxYearStart date = DATEFROMPARTS(
           CASE WHEN MONTH(@today) < 3 THEN YEAR(@today) - 1 ELSE YEAR(@today) END,
           3,
           1
         );

         UPDATE ${this.tableName}
         SET TaxYearStart = CASE
           WHEN CAST(DateEngaged AS date) > @taxYearStart THEN CAST(DateEngaged AS date)
           ELSE @taxYearStart
         END
         WHERE DateEngaged IS NOT NULL
           AND (
             TaxYearStart IS NULL
             OR CAST(TaxYearStart AS date) <> CASE
               WHEN CAST(DateEngaged AS date) > @taxYearStart THEN CAST(DateEngaged AS date)
               ELSE @taxYearStart
             END
           );

         SELECT @@ROWCOUNT AS rowsAffected;`
      );
      const rowsAffected = result[0]?.rowsAffected ?? 0;
      console.log(
        `TaxYearStart refresh completed: ${rowsAffected} row(s) updated`
      );
      return rowsAffected;
    } catch (error) {
      console.error('Error refreshing TaxYearStart:', error);
      throw error;
    }
  }

  async getDetailsExportRows(
    companyNumber: string
  ): Promise<EmployeeDetailsExportRow[]> {
    return this.executeQuery<EmployeeDetailsExportRow>(
      `SELECT 
        @companyNumber AS Company,
        EmplNo AS Employee,
        LastName AS Surname,
        Initials,
        FirstName AS [First name],
        SecondName AS [Second name],
        knownAs AS [Known as],
        Title,
        IDNumber AS [Id number/Co No],
        CONVERT(varchar(10), DateOfBirth, 111) AS [Date of birth],
        CONVERT(varchar(10), DateEngaged, 111) AS [Date engaged],
        CAST(NULL AS varchar(10)) AS [Date terminated],
        Language,
        EthnicGroup AS [Group],
        Gender,
        MaritalStatus AS [Marital status],
        AlternativeNumber AS [Home number],
        BusinessNUmber AS [Business number],
        CellNumber AS [Cell number],
        TaxNumber AS [Tax number],
        TaxStatus AS [Tax status],
        UIFStatus AS [UIF status],
        CONVERT(varchar(10), TaxYearStart, 111) AS [Tax year start],
        CONVERT(varchar(10), UIFEndDate, 111) AS [UIF End Date],
        CONVERT(varchar(10), NewUIFStartDate, 111) AS [New UIF Start Date],
        PayMethod AS [Pay method],
        BankAccType AS [Bank acc type],
        BankAccNo AS [Bank acc no],
        BranchCode AS [Branch code],
        BankName AS [Bank name],
        AccHolder AS [Acc holder],
        AccRelationship AS [Acc relationship],
        HrsPerPeriod AS [Hrs per period],
        HoursPerDay AS [Hours per day],
        WorkAddressCode AS [Work address code],
        RepAddr1 AS [Rep addr1],
        RepAddr2 AS [Rep addr2],
        RepAddr3 AS [Rep addr3],
        RepPostCode AS [Rep post code],
        ResUnit AS [Res unit],
        ResComplex AS [Res complex],
        ResStreetNo AS [Res street no],
        ResStreetName AS [Res street name],
        ResSuburb AS [Res suburb],
        ResCity AS [Res city],
        ResPostCode AS [Res post code],
        ResidentialCountry AS [Residential Country],
        LinkPostalTo AS [Link postal to]
       FROM ${this.tableName}
       WHERE EmplNo IS NOT NULL
         AND IDNumber IS NOT NULL
       ORDER BY EmplNo`,
      { companyNumber }
    );
  }

  async getAvailableEmployeeNumbers(): Promise<{ FANumber: string }[]> {
    try {
      console.log('Fetching available employee numbers...');
      const result = await this.executeQuery<{ FANumber: string }>(
        `SELECT FANumber FROM dbo.TEmployee_Avail_EmplNo ORDER BY FANumber`
      );
      console.log(`Found ${result.length} available employee numbers`);
      return result;
    } catch (error) {
      console.error('Error in getAvailableEmployeeNumbers:', error);
      throw error;
    }
  }

  async getMostCommonRate(): Promise<number | null> {
    try {
      console.log('Fetching most common employee rate...');
      const result = await this.executeQuery<{ RATE: number }>(
        `SELECT TOP 1 RATE
         FROM ${this.tableName}
         WHERE RATE IS NOT NULL
         GROUP BY RATE
         ORDER BY COUNT(*) DESC, RATE DESC`
      );
      const rate = result[0]?.RATE ?? null;
      console.log(`Most common rate: ${rate}`);
      return rate;
    } catch (error) {
      console.error('Error in getMostCommonRate:', error);
      throw error;
    }
  }
}
