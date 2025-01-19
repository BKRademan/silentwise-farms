import { ConnectionPool, config } from 'mssql';

const dbConfig: config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || '',
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectTimeout: 30000,
    requestTimeout: 30000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 300000,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
  }
};

// Create a singleton connection pool
let pool: ConnectionPool | null = null;
let isConnecting = false;
let lastError: Error | null = null;
let lastErrorTime: number = 0;

// Get or create the connection pool
const getPool = async () => {
  try {
    // If we already have a pool and it's connected, return it
    if (pool?.connected) {
      return pool;
    }

    // If we're already trying to connect, wait for that to finish
    if (isConnecting) {
      console.log('Connection in progress, waiting...');
      await new Promise(resolve => setTimeout(resolve, 100));
      return getPool();
    }

    // If we had a recent error (within last 5 seconds), don't retry immediately
    if (lastError && (Date.now() - lastErrorTime) < 5000) {
      console.log('Recent connection error, waiting before retry...');
      throw lastError;
    }

    isConnecting = true;
    console.log('Creating new database connection pool...');
    
    // Close existing pool if it exists
    if (pool) {
      try {
        console.log('Closing existing pool...');
        await pool.close();
        pool = null;
      } catch (err) {
        console.warn('Error closing existing pool:', err);
      }
    }

    // Create new pool
    pool = new ConnectionPool(dbConfig);
    
    // Handle pool errors
    pool.on('error', err => {
      console.error('Pool error:', err);
      lastError = err instanceof Error ? err : new Error(String(err));
      lastErrorTime = Date.now();
      if (pool?.connected) {
        try {
          pool.close();
        } catch (closeErr) {
          console.warn('Error closing pool after error:', closeErr);
        }
      }
      pool = null;
    });

    await pool.connect();
    console.log('Successfully connected to the database');
    lastError = null;
    return pool;
  } catch (err) {
    console.error('Database connection failed:', err);
    lastError = err instanceof Error ? err : new Error(String(err));
    lastErrorTime = Date.now();
    pool = null;
    throw err;
  } finally {
    isConnecting = false;
  }
};

// Get a new connection from the pool with retry logic
const getConnection = async (retries = 3, backoff = 1000) => {
  try {
    const pool = await getPool();
    if (!pool) {
      throw new Error('Failed to get database pool');
    }
    return pool.request();
  } catch (err) {
    if (retries > 0) {
      console.log(`Retrying database connection... (${retries} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      // Exponential backoff
      return getConnection(retries - 1, backoff * 2);
    }
    console.error('Failed to get database connection after retries:', err);
    throw err;
  }
};

// Cleanup function to be called on application shutdown
const cleanup = async () => {
  if (pool) {
    try {
      await pool.close();
      pool = null;
    } catch (err) {
      console.error('Error during pool cleanup:', err);
    }
  }
};

export { getConnection, cleanup }; 