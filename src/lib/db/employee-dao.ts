import { BaseDAO } from './base-dao';
import { Employee } from '@/types/database';
import { toSqlDateOnly } from '@/lib/date-time/south-africa';

interface EmployeeWithLastWorked extends Employee {
  lastWorkedDate: Date | null;
  fullName?: string;
}

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

  async addEmployee(employee: Omit<Employee, 'ID'>): Promise<Employee> {
    try {
      console.log('Adding new employee:', employee);
      const result = await this.executeQuery<Employee>(
        `INSERT INTO ${this.tableName} (
          EmplNo, LastName, FirstName, knownAs,
          RATE, IDNumber, DateEngaged
        ) VALUES (
          @emplNo, @lastName, @firstName, @knownAs,
          @rate, @idNumber, CONVERT(date, @dateEngaged, 23)
        );
        SELECT SCOPE_IDENTITY() as ID;`,
        {
          emplNo: employee.EmplNo,
          lastName: employee.LastName,
          firstName: employee.FirstName,
          knownAs: employee.knownAs,
          rate: employee.RATE,
          idNumber: employee.IDNumber,
          dateEngaged: this.formatSQLDate(employee.DateEngaged)
        }
      );

      const newEmployee = {
        ID: result[0].ID,
        ...employee
      };
      console.log('Successfully added employee:', newEmployee);
      return newEmployee;
    } catch (error) {
      console.error('Error in addEmployee:', error);
      throw error;
    }
  }

  async updateEmployee(id: number, employee: Partial<Employee>): Promise<void> {
    try {
      console.log('Updating employee:', { id, ...employee });
      const updates = Object.entries(employee)
        .filter(([key]) => key !== 'ID')
        .map(([key]) => (
          key === 'DateEngaged'
            ? `${key} = CONVERT(date, @${key}, 23)`
            : `${key} = @${key}`
        ))
        .join(', ');

      const normalizedEmployee = {
        ...employee,
        DateEngaged: employee.DateEngaged ? this.formatSQLDate(employee.DateEngaged) : employee.DateEngaged,
      };

      await this.executeQuery(
        `UPDATE ${this.tableName} 
         SET ${updates}
         WHERE ID = @id`,
        {
          ...normalizedEmployee,
          id
        }
      );
      console.log('Successfully updated employee:', id);
    } catch (error) {
      console.error('Error in updateEmployee:', error);
      throw error;
    }
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
      console.log(`Found ${result.length} employees for grower ${growerId} on date ${date}`);
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
      
      // Log a sample record to see structure
      if (result.length > 0) {
        console.log('Sample employee record:', JSON.stringify(result[0]));
      }
      
      // Format the results and provide fallbacks for missing data
      const formattedResults = result.map(emp => {
        // If neither FirstName nor LastName has data, use "-" as fallback
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
          BankAccNo: emp.BankAccNo || ''
        };
      });
      
      // Log a sample formatted record
      if (formattedResults.length > 0) {
        console.log('Sample formatted record:', JSON.stringify(formattedResults[0]));
      }
      
      console.log(`Found ${formattedResults.length} employees with last worked dates`);
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
        WHERE e.ID = @id`,
        { id }
      );
      
      if (result.length === 0) {
        console.log(`No employee found with ID: ${id}`);
        return null;
      }
      
      // Format the results and provide fallbacks for missing data
      const nameStr = `${result[0].FirstName || ''} ${result[0].LastName || ''}`.trim(); 
      const fullName = nameStr || '-';
      
      const employee = {
        ...result[0],
        LastName: result[0].LastName || '',
        FirstName: result[0].FirstName || '',
        fullName,
        knownAs: result[0].knownAs || '',
        IDNumber: result[0].IDNumber || '',
        BankName: result[0].BankName || '',
        BranchCode: result[0].BranchCode || '',
        AccHolder: result[0].AccHolder || '',
        BankAccNo: result[0].BankAccNo || ''
      };
      
      console.log(`Found employee details for ID: ${id}`);
      return employee;
    } catch (error) {
      console.error(`Error in findByIdWithDetails for ID: ${id}:`, error);
      throw error;
    }
  }

  async getAvailableEmployeeNumbers(): Promise<{FANumber: string}[]> {
    try {
      console.log('Fetching available employee numbers...');
      const result = await this.executeQuery<{FANumber: string}>(
        `SELECT FANumber FROM dbo.TEmployee_Avail_EmplNo ORDER BY FANumber`
      );
      console.log(`Found ${result.length} available employee numbers`);
      return result;
    } catch (error) {
      console.error('Error in getAvailableEmployeeNumbers:', error);
      throw error;
    }
  }
} 