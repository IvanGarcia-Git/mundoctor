import pg from 'pg';
import dotenv from 'dotenv';
import { logInfo, logError, logWarning, logDebug } from '../utils/logger.js';

dotenv.config();

const { Pool } = pg;

// Database configuration - Support both DATABASE_URL and individual variables
let dbConfig;

if (process.env.DATABASE_URL) {
  // Use DATABASE_URL if available (Docker environment)
  dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.DB_POOL_MAX) || 20, // Maximum number of clients in the pool
    min: parseInt(process.env.DB_POOL_MIN) || 0, // Minimum number of clients in the pool
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000, // Return an error after 2 seconds if connection could not be established
    acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000, // Pool acquire timeout
    createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT) || 8000, // Pool create timeout
    destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT) || 5000, // Pool destroy timeout
    reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL) || 1000, // Pool reap interval
    createRetryIntervalMillis: parseInt(process.env.DB_CREATE_RETRY_INTERVAL) || 200, // Pool create retry interval
  };
} else {
  // Use individual variables (local development)
  dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'mundoctor',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT) || 5432,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.DB_POOL_MAX) || 20, // Maximum number of clients in the pool
    min: parseInt(process.env.DB_POOL_MIN) || 0, // Minimum number of clients in the pool
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000, // Return an error after 2 seconds if connection could not be established
    acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000, // Pool acquire timeout
    createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT) || 8000, // Pool create timeout
    destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT) || 5000, // Pool destroy timeout
    reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL) || 1000, // Pool reap interval
    createRetryIntervalMillis: parseInt(process.env.DB_CREATE_RETRY_INTERVAL) || 200, // Pool create retry interval
  };
}

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool events for monitoring
pool.on('error', (err, client) => {
  logError(err, { event: 'pool_error', client: client?.processID });
  // Don't exit immediately, let the app handle gracefully
});

pool.on('connect', (client) => {
  logDebug('New database client connected', { processID: client.processID });
});

pool.on('acquire', (client) => {
  logDebug('Client acquired from pool', { processID: client.processID });
});

pool.on('release', (err, client) => {
  if (err) {
    logError(err, { event: 'pool_release_error', processID: client?.processID });
  } else {
    logDebug('Client released to pool', { processID: client?.processID });
  }
});

// Pool monitoring function
export const getPoolStatus = () => {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
};

// Log pool status periodically in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const status = getPoolStatus();
    if (status.totalCount > 0) {
      logDebug('Database pool status', status);
    }
  }, 30000); // Every 30 seconds
}

// Test database connection with health check
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW(), version() as db_version');
    
    logInfo('Database connected successfully', {
      timestamp: result.rows[0].now,
      version: result.rows[0].db_version,
      poolStatus: getPoolStatus(),
    });
    
    client.release();
    return true;
  } catch (err) {
    logError(err, { event: 'connection_test_failed' });
    return false;
  }
};

// Execute query with enhanced logging and monitoring
export const query = async (text, params) => {
  const start = Date.now();
  const queryId = Math.random().toString(36).substr(2, 9);
  
  try {
    logDebug('Executing query', { 
      queryId, 
      query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      paramCount: params?.length || 0 
    });
    
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries (> 1 second)
    if (duration > 1000) {
      logWarning('Slow query detected', { 
        queryId, 
        duration, 
        query: text,
        rows: result.rowCount 
      });
    } else {
      logDebug('Query completed', { 
        queryId, 
        duration, 
        rows: result.rowCount 
      });
    }
    
    return result;
  } catch (err) {
    const duration = Date.now() - start;
    logError(err, { 
      queryId, 
      duration, 
      query: text,
      params: params?.length || 0,
      event: 'query_error' 
    });
    throw err;
  }
};

// Get a client from the pool for transactions
export const getClient = async () => {
  try {
    const client = await pool.connect();
    return client;
  } catch (err) {
    console.error('Error getting database client:', err.message);
    throw err;
  }
};

// Transaction helper
export const withTransaction = async (callback) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Close pool gracefully
export const closePool = async () => {
  try {
    logInfo('Closing database pool...');
    await pool.end();
    logInfo('Database pool closed successfully');
  } catch (err) {
    logError(err, { event: 'pool_close_error' });
    throw err;
  }
};

export default pool;