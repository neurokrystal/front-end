import { defineConfig } from 'drizzle-kit';
import { env } from './src/infrastructure/config';

export default defineConfig({
  schema: './src/domains/**/**.schema.ts',
  out: './src/infrastructure/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: env.POSTGRES_DB_URL,
  },
  // CRITICAL: Never touch Better-Auth tables
  tablesFilter: ['!user', '!session', '!account', '!verification', '!organization', '!member', '!invitation', '!assets', '!consent_records_deprecated'],
});
