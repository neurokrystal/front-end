import { db } from '@/infrastructure/database/connection';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Creating missing auth tables...');
  try {
    // Session table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "session" (
        "id" TEXT PRIMARY KEY,
        "user_id" TEXT NOT NULL REFERENCES "user"("id"),
        "token" TEXT NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "ip_address" TEXT,
        "user_agent" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL,
        "updated_at" TIMESTAMPTZ NOT NULL
      )
    `);

    // Account table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "account" (
        "id" TEXT PRIMARY KEY,
        "user_id" TEXT NOT NULL REFERENCES "user"("id"),
        "account_id" TEXT NOT NULL,
        "provider_id" TEXT NOT NULL,
        "password" TEXT,
        "access_token" TEXT,
        "refresh_token" TEXT,
        "id_token" TEXT,
        "expires_at" TIMESTAMPTZ,
        "password_expires_at" TIMESTAMPTZ,
        "scope" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL,
        "updated_at" TIMESTAMPTZ NOT NULL
      )
    `);

    // Verification table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "verification" (
        "id" TEXT PRIMARY KEY,
        "identifier" TEXT NOT NULL,
        "value" TEXT NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "created_at" TIMESTAMPTZ,
        "updated_at" TIMESTAMPTZ
      )
    `);

    console.log('Successfully created missing auth tables.');
  } catch (error) {
    console.error('Failed to create auth tables:', error);
    process.exit(1);
  }
  process.exit(0);
}

main();
