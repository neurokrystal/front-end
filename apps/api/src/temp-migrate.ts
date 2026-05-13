import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Client } = pkg;
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const connectionString = 'postgresql://dimensional_test:AVNS_fjAFcGHmlJglQdGjcBc@dimensional-db-do-user-37024147-0.f.db.ondigitalocean.com:25060/app_test?sslmode=require&uselibpqcompat=true';
  const client = new Client({ connectionString });
  await client.connect();

  const migrationFile = path.resolve('src/infrastructure/database/migrations/0016_square_apocalypse.sql');
  const sql = fs.readFileSync(migrationFile, 'utf8');

  console.log('Running migration...');
  const statements = sql.split('--> statement-breakpoint');

  for (const statement of statements) {
    if (statement.trim()) {
      try {
        await client.query(statement);
      } catch (e: any) {
        console.error(`Error in statement: ${statement}`);
        console.error(e.message);
        // Continue if column already exists or similar, but be careful
        if (e.message.includes('already exists')) {
            console.log('Skipping because it already exists.');
        } else {
            throw e;
        }
      }
    }
  }

  await client.end();
  console.log('Done.');
}

run().catch(console.error);
