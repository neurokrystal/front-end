import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '@/infrastructure/config';

const { Pool } = pg;

let connectionString = env.POSTGRES_DB_URL;

// Handle the new pg/Node 24 SSL defaults
if (connectionString.includes("sslmode=require") && !connectionString.includes("uselibpqcompat")) {
  const separator = connectionString.includes("?") ? "&" : "?";
  connectionString += `${separator}uselibpqcompat=true`;
}

export const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("sslmode=require") || env.NODE_ENV === "production" || env.APP_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool);
export type DrizzleDb = typeof db;
