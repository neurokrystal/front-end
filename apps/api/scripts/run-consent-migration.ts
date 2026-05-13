import { pool } from '../src/infrastructure/database/connection';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const sqlFile = path.join(__dirname, '../src/infrastructure/database/migrations/0012_consent_migration.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  console.log('Running migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ Migration successful');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
