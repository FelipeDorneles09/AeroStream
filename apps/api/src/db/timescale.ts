import pg from 'pg';
import { config } from '../config/env.js';

const { Pool } = pg;

export const dbPool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

dbPool.on('error', (err) => {
  console.error('[Database Pool Error]: Unexpected error on idle client', err);
});

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const res = await dbPool.query('SELECT 1 as healthy');
    return res.rows[0]?.healthy === 1;
  } catch (err) {
    return false;
  }
}
