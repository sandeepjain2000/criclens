/**
 * Postgres connection pools — one per format.
 *
 * The Test format has been on Supabase from day one via SUPABASE_URL.
 * T20 and LOI live in their own Postgres databases (local today, separate
 * Supabase projects later) addressed by their own env vars:
 *   SUPABASE_URL       — Test  (existing)
 *   SUPABASE_URL_T20   — T20   (new)
 *   SUPABASE_URL_LOI   — LOI   (new)
 *
 * Usage:
 *   import pool, { getPool } from '@/lib/db';
 *   const rows = (await pool.query('SELECT …')).rows;          // defaults to Test
 *   const rows = (await getPool('t20').query('SELECT …')).rows;
 */

import { Pool } from 'pg';

const URL_BY_FORMAT = {
  test: process.env.SUPABASE_URL,
  t20:  process.env.SUPABASE_URL_T20 || process.env.PG_URL_T20,
  loi:  process.env.SUPABASE_URL_LOI || process.env.PG_URL_LOI,
};

const POOL_OPTS = {
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

const pools = {};

export function getPool(format = 'test') {
  const key = String(format).toLowerCase();
  if (!(key in URL_BY_FORMAT)) {
    throw new Error(`Unknown Postgres format '${format}'. Expected one of: test, t20, loi.`);
  }
  if (pools[key]) return pools[key];

  const connectionString = URL_BY_FORMAT[key];
  if (!connectionString) {
    const envName = key === 'test' ? 'SUPABASE_URL' : `SUPABASE_URL_${key.toUpperCase()}`;
    console.warn(`${envName} is not set — Postgres queries for '${key}' will fail.`);
  }

  pools[key] = new Pool({ connectionString, ...POOL_OPTS });
  return pools[key];
}

// Default export preserved for backwards-compat with existing Test route imports
const pool = getPool('test');
export default pool;
