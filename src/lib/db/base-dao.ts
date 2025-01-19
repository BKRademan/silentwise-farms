import { IResult } from 'mssql';
import { getConnection } from './config';

export class BaseDAO<T> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async findAll(): Promise<T[]> {
    try {
      const request = await getConnection();
      const result: IResult<T> = await request.query(`SELECT * FROM ${this.tableName}`);
      return result.recordset;
    } catch (error) {
      console.error(`Error in findAll for ${this.tableName}:`, error);
      throw error;
    }
  }

  async findById(id: number): Promise<T | null> {
    try {
      const request = await getConnection();
      const result: IResult<T> = await request
        .input('id', id)
        .query(`SELECT * FROM ${this.tableName} WHERE ID = @id`);
      return result.recordset[0] || null;
    } catch (error) {
      console.error(`Error in findById for ${this.tableName}:`, error);
      throw error;
    }
  }

  protected async executeQuery<R>(
    query: string,
    params?: { [key: string]: any }
  ): Promise<R[]> {
    try {
      console.log(`🔄 Executing query for ${this.tableName}:`, {
        query,
        params: params ? JSON.stringify(params) : 'no params'
      });
      
      const request = await getConnection();
      console.log('✅ Got database connection');

      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          console.log(`Adding parameter ${key}:`, value);
          request.input(key, value);
        });
      }

      const result = await request.query(query);
      console.log(`✅ Query executed successfully, returned ${result.recordset.length} records`);
      return result.recordset;
    } catch (error) {
      console.error(`❌ Error executing query for ${this.tableName}:`, error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      throw error;
    }
  }

  protected async executeProcedure<R>(
    procedureName: string,
    params?: { [key: string]: any }
  ): Promise<R[]> {
    try {
      const request = await getConnection();

      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          request.input(key, value);
        });
      }

      const result = await request.execute(procedureName);
      return result.recordset;
    } catch (error) {
      console.error(`Error executing procedure ${procedureName}:`, error);
      throw error;
    }
  }
} 