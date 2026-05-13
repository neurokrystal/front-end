import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function setup() {
  const TEST_DB_URL = process.env.POSTGRES_DB_URL;
  if (!TEST_DB_URL) {
      throw new Error('POSTGRES_DB_URL is not set in global setup');
  }
  
  process.stdout.write('Global setup: Initializing test database...\n');

  const pool = new Pool({ 
    connectionString: TEST_DB_URL,
    ssl: TEST_DB_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false
  });

  try {
    // 1. Clean the schema
    /*process.stdout.write('Cleaning schema...\n');
    const tables = await pool.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`);
    for (const table of tables.rows) {
        process.stdout.write(`  Dropping table ${table.tablename}...\n`);
        await pool.query(`DROP TABLE IF EXISTS public."${table.tablename}" CASCADE`);
    }
    const types = await pool.query(`SELECT typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype = 'e'`);
    for (const type of types.rows) {
        process.stdout.write(`  Dropping type ${type.typname}...\n`);
        await pool.query(`DROP TYPE IF EXISTS public."${type.typname}" CASCADE`);
    }
    await pool.query(`DROP SCHEMA IF EXISTS drizzle CASCADE;`);
	*/
    // 2. Ensure Better-Auth tables
    process.stdout.write('Ensuring Better-Auth tables...\n');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "user" (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          role TEXT DEFAULT 'user',
          email_verified BOOLEAN DEFAULT false,
          image TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS "organization" (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT UNIQUE,
          logo TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          metadata TEXT
      );
      CREATE TABLE IF NOT EXISTS "member" (
          id TEXT PRIMARY KEY,
          organization_id TEXT NOT NULL REFERENCES "organization"(id),
          user_id TEXT NOT NULL REFERENCES "user"(id),
          role TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);

    // 3. Run migrations
    process.stdout.write('Running migrations...\n');
    const db = drizzle(pool);
    await migrate(db, { 
      migrationsFolder: path.resolve(__dirname, '../infrastructure/database/migrations') 
    });

    process.stdout.write('Global setup complete.\n');
  } catch (error) {
    process.stderr.write(`Global setup error: ${error.message}\n`);
    throw error;
  } finally {
    await pool.end();
  }
}
