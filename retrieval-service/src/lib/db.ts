import postgres from 'postgres';
import { env } from './env.ts';

export const sql = postgres(env.SUPABASE_DB_URL, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
  types: {
    // Map Postgres bigint to number (safe for our row counts)
    bigint: postgres.BigInt,
  },
});

export type Sql = typeof sql;
