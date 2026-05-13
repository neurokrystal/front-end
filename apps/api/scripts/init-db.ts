import { execSync } from 'child_process';

async function main() {
  console.log('🚀 Starting Database Initialization...');

  try {
    // 1. Drizzle Push (Handles main app tables and indexes)
    console.log('\n📦 Pushing Drizzle schema...');
    execSync('npx drizzle-kit push', { stdio: 'inherit' });

    // 2. Better-Auth Migrate (Handles auth tables)
    console.log('\n🔐 Migrating Better-Auth tables...');
    // Note: better-auth migrate might be interactive in some cases, 
    // but usually it's fine if the database is already reachable.
    // We use --yes or similar if available, but it seems it doesn't have one?
    // Let's try running it.
    execSync('npx better-auth migrate', { stdio: 'inherit' });

    // 3. Run Seeds
    console.log('\n🌱 Seeding database with sample data...');
    execSync('tsx src/infrastructure/database/seeds/run-seeds.ts', { stdio: 'inherit' });

    console.log('\n✅ Database initialization complete!');
  } catch (error) {
    console.error('\n❌ Database initialization failed:');
    console.error(error);
    process.exit(1);
  }
}

main();
