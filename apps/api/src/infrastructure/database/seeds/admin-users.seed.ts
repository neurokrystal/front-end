import { db } from '@/infrastructure/database/connection';
import { auth } from '@/infrastructure/auth/better-auth';
import { sql } from 'drizzle-orm';

async function ensureAdminUser(email: string, name: string, password: string) {
  // Check if user exists using direct SQL for safety with Better-Auth's tables
  const existing = await db.execute(sql`SELECT id FROM "user" WHERE email = ${email}`);
  
  if (existing.rows.length > 0) {
    // Update role to platform_admin
    await db.execute(sql`UPDATE "user" SET role = 'platform_admin', name = ${name} WHERE email = ${email}`);
    console.log(`Updated existing user: ${email}`);
    return;
  }

  // Create new user via Better-Auth's API
  try {
    await auth.api.signUpEmail({
      body: { email, password, name },
    });
    // Then set the role and verify email
    await db.execute(sql`UPDATE "user" SET role = 'platform_admin', email_verified = true WHERE email = ${email}`);
    console.log(`Created admin user: ${email}`);
  } catch (error) {
    console.error(`Error creating user ${email}:`, error);
  }
}

async function main() {
  console.log('--- Seeding Admin Users ---');
  await ensureAdminUser('alistair@littlegoblin.org', 'Alistair', '99999_66666');
  await ensureAdminUser('krystal@dimensionalsystem.com', 'Krystal', '99999_66666');
  console.log('--- Admin Users Seeded ---');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
