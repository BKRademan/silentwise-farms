import sql from 'mssql';
import { getDbConfig } from '../db-config';

export type QueryParams = Record<string, any>;

/** A parameter with an explicit SQL type; untyped params let `mssql` infer one from the JS value. */
export interface TypedParam {
  sqlType: sql.ISqlType;
  value: unknown;
}

/** DECIMAL parameter, so money/quantities reach SQL Server exactly instead of as FLOAT. */
export function decimalParam(value: number | null, precision: number, scale = 2): TypedParam {
  return { sqlType: sql.Decimal(precision, scale), value };
}

/** Runs statements on one open transaction; created by `BaseDAO.withTransaction`. */
export interface TransactionContext {
  /** New request bound to the transaction, for anything `query` doesn't cover. */
  request: () => sql.Request;
  query: <R>(query: string, params?: QueryParams) => Promise<R[]>;
}

function isTypedParam(value: unknown): value is TypedParam {
  return typeof value === 'object' && value !== null && 'sqlType' in value;
}

function bindParams(request: sql.Request, params?: QueryParams): sql.Request {
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (isTypedParam(value)) {
        console.log(`Adding parameter ${key}: ${value.value}`);
        request.input(key, value.sqlType, value.value);
        return;
      }
      console.log(`Adding parameter ${key}: ${value}`);
      request.input(key, value);
    });
  }
  return request;
}

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

  protected async executeQuery<R>(query: string, params?: QueryParams): Promise<R[]> {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        const pool = await this.getConnection();
        const request = bindParams(pool.request(), params);

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

  /**
   * Runs `fn` inside a single transaction: commits if it resolves, rolls back and rethrows if it
   * throws. Statements must be awaited one at a time (a transaction holds one connection).
   * Not retried on connection errors, because a half-applied transaction cannot be replayed safely.
   */
  protected async withTransaction<R>(fn: (tx: TransactionContext) => Promise<R>): Promise<R> {
    const pool = await this.getConnection();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    const tx: TransactionContext = {
      request: () => new sql.Request(transaction),
      query: async <Q>(query: string, params?: QueryParams) => {
        console.log('Executing query (transaction):', query);
        const result = await bindParams(new sql.Request(transaction), params).query<Q>(query);
        return result.recordset ?? [];
      },
    };

    try {
      const result = await fn(tx);
      await transaction.commit();
      return result;
    } catch (error) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        // SQL Server may already have rolled back (e.g. XACT_ABORT); the original error matters more.
        console.error(`Rollback failed for ${this.tableName}:`, rollbackError);
      }
      throw error;
    }
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