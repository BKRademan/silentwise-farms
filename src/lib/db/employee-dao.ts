import { BaseDAO } from './base-dao';
import { Employee } from '@/types/database';

export class EmployeeDAO extends BaseDAO<Employee> {
  constructor() {
    super('dbo.TEmployee_Details');
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
          @rate, @idNumber, @dateEngaged
        );
        SELECT SCOPE_IDENTITY() as ID;`,
        {
          emplNo: employee.EmplNo,
          lastName: employee.LastName,
          firstName: employee.FirstName,
          knownAs: employee.knownAs,
          rate: employee.RATE,
          idNumber: employee.IDNumber,
          dateEngaged: employee.DateEngaged
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
        .map(([key]) => `${key} = @${key}`)
        .join(', ');

      await this.executeQuery(
        `UPDATE ${this.tableName} 
         SET ${updates}
         WHERE ID = @id`,
        {
          ...employee,
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
    date: Date
  ): Promise<Employee[]> {
    try {
      console.log('Getting employees by grower and date:', { growerId, date });
      const result = await this.executeQuery<Employee>(
        `SELECT DISTINCT e.* 
         FROM ${this.tableName} e
         INNER JOIN dbo.THour_Data_View h ON e.ID = h.Employee_ID_FK
         WHERE h.Grower_ID = @growerId 
         AND CAST(h.Work_Date AS DATE) = CAST(@date AS DATE)
         ORDER BY e.LastName, e.FirstName`,
        { growerId, date }
      );
      console.log(`Found ${result.length} employees for grower ${growerId} on date ${date}`);
      return result;
    } catch (error) {
      console.error('Error in getEmployeesByGrowerAndDate:', error);
      throw error;
    }
  }
} 