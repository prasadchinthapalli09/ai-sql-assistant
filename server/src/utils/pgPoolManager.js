const { Pool } = require("pg");

// Cache of live pg Pools keyed by connectionId, so we don't reconnect on
// every single query. Pools are lazily created and can be evicted.
const pools = new Map();

function getPool(connectionId, connectionString, schemaName = null) {
  if (pools.has(connectionId)) {
    return pools.get(connectionId);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    // For uploaded datasets, every connection in this pool defaults its
    // search_path to the dataset's isolated schema, so queries never need
    // to (and can't accidentally) reach outside it.
    ...(schemaName ? { options: `-c search_path=${schemaName},public` } : {}),
  });

  pools.set(connectionId, pool);
  return pool;
}

/**
 * A short-lived, uncached pool/client for one-off admin operations during
 * import (CREATE SCHEMA, CREATE TABLE, bulk INSERT). Always call end().
 */
function createAdminPool(connectionString) {
  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 2,
    connectionTimeoutMillis: 15000,
  });
}

async function closePool(connectionId) {
  const pool = pools.get(connectionId);
  if (pool) {
    await pool.end();
    pools.delete(connectionId);
  }
}

async function testConnection(connectionString) {
  const testPool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 8000,
  });
  try {
    await testPool.query("SELECT 1");
    return true;
  } finally {
    await testPool.end();
  }
}

module.exports = { getPool, closePool, testConnection, createAdminPool };
