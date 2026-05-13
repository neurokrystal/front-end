import { db } from '@/infrastructure/database/connection';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Adding missing columns to "user" table...');
  try {
    await db.execute(sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS role TEXT`);
    await db.execute(sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT false`);
    await db.execute(sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS ban_reason TEXT`);
    await db.execute(sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS ban_expires TIMESTAMPTZ`);
    console.log('Successfully added missing columns.');
  } catch (error) {
    console.error('Failed to add columns:', error);
    process.exit(1);
  }
  process.exit(0);
}

main();
