import { pool } from '../src/infrastructure/database/connection';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const migrationsDir = path.join(__dirname, '../src/infrastructure/database/migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log('Found migrations:', files);

  const client = await pool.connect();
  try {
    // Create migrations table if not exists
    await client.query('CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (id SERIAL PRIMARY KEY, name TEXT UNIQUE, created_at TIMESTAMP DEFAULT NOW())');

    for (const file of files) {
      const { rows } = await client.query('SELECT name FROM "__drizzle_migrations" WHERE name = $1', [file]);
      if (rows.length > 0) {
        console.log(`Skipping ${file} (already applied)`);
        continue;
      }

      console.log(`Applying ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO "__drizzle_migrations" (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✅ Applied ${file}`);
      } catch (e) {
        await client.query('ROLLBACK');
        console.error(`❌ Failed to apply ${file}:`, e);
        // Continue or stop? Let's stop.
        throw e;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
