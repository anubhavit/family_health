const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  max: parseInt(process.env.DB_POOL_MAX || '10'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000,
});

pool.on('connect', (client) => {
  client.query("SET app.user_id = '00000000-0000-0000-0000-000000000000'");
});

pool.on('error', (err) => {
  logger.error('Unexpected DB pool error', { error: err.message });
});

async function query(text, params, userId = null) {
  const client = await pool.connect();
  try {
    if (userId) await client.query(`SET LOCAL app.user_id = '${userId}'`);
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

async function transaction(fn, userId = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (userId) await client.query(`SET LOCAL app.user_id = '${userId}'`);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, transaction };
