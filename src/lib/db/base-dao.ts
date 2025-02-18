import sql from 'mssql';
import { getDbConfig } from '../db-config';

export class BaseDAO<T> {
  protected tableName: string;
  private static pool: sql.ConnectionPool | null = null;
  private static poolConnect: Promise<sql.ConnectionPool> | null = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  private async getConnection(): Promise<sql.ConnectionPool> {
    if (BaseDAO.pool) {
      // Check if the connection is still valid
      try {
        await BaseDAO.pool.request().query('SELECT 1');
        return BaseDAO.pool;
      } catch (error) {
        console.log('Existing connection is invalid, creating new connection...');
        BaseDAO.pool = null;
        BaseDAO.poolConnect = null;
      }
    }

    if (!BaseDAO.poolConnect) {
      console.log('Creating new database connection...');
      const config = getDbConfig();
      BaseDAO.pool = new sql.ConnectionPool(config);
      BaseDAO.poolConnect = BaseDAO.pool.connect();
    }

    try {
      const pool = await BaseDAO.poolConnect;
      console.log('✅ Successfully connected to database');
      return pool;
    } catch (error) {
      console.error('❌ Failed to connect to database:', error);
      // Reset the pool and poolConnect so we can try again next time
      BaseDAO.pool = null;
      BaseDAO.poolConnect = null;
      throw error;
    }
  }

  async findAll(): Promise<T[]> {
    try {
      const pool = await this.getConnection();
      const request = pool.request();
      const result: sql.IResult<T> = await request.query(`SELECT * FROM ${this.tableName}`);
      return result.recordset;
    } catch (error) {
      console.error(`Error in findAll for ${this.tableName}:`, error);
      throw error;
    }
  }

  async findById(id: number): Promise<T | null> {
    try {
      const pool = await this.getConnection();
      const request = pool.request();
      const result: sql.IResult<T> = await request
        .input('id', sql.Int, id)
        .query(`SELECT * FROM ${this.tableName} WHERE ID = @id`);
      return result.recordset[0] || null;
    } catch (error) {
      console.error(`Error in findById for ${this.tableName}:`, error);
      throw error;
    }
  }

  protected async executeQuery<R>(query: string, params?: Record<string, any>): Promise<R[]> {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        const pool = await this.getConnection();
        const request = pool.request();

        // Add parameters to the request if they exist
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            console.log(`Adding parameter ${key}: ${value}`);
            request.input(key, value);
          });
        }

        console.log('Executing query:', query);
        const result = await request.query<R>(query);
        
        // Handle queries that don't return records (like DELETE)
        if (!result.recordset) {
          console.log('✅ Query executed successfully (no records returned)');
          return [];
        }
        
        console.log('✅ Query executed successfully, returned', result.recordset.length, 'records');
        return result.recordset;
      } catch (error) {
        console.error(`❌ Error executing query for ${this.tableName}:`, error);
        
        // Check if it's a connection error
        if (error instanceof sql.ConnectionError || 
            (error as any)?.code === 'ECONNCLOSED' ||
            (error as Error)?.message?.includes('Connection is closed')) {
          retryCount++;
          console.log(`Retrying... Attempt ${retryCount} of ${maxRetries}`);
          // Reset the connection pool
          BaseDAO.pool = null;
          BaseDAO.poolConnect = null;
          
          if (retryCount < maxRetries) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
            continue;
          }
        }
        
        // If we get here, either it's not a connection error or we've exhausted retries
        throw error;
      }
    }
    
    throw new Error(`Failed to execute query after ${maxRetries} attempts`);
  }

  protected async executeProcedure<R>(
    procedureName: string,
    params?: { [key: string]: any }
  ): Promise<R[]> {
    try {
      const pool = await this.getConnection();
      const request = pool.request();

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