import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const TEST_DB_URL = process.env.POSTGRES_DB_URL!;

if (!TEST_DB_URL) {
  throw new Error('POSTGRES_DB_URL is not set. Check your .env file or vitest.config.ts');
}

// Mock infrastructure services that shouldn't run in tests
vi.mock('@/infrastructure/storage/do-storage.service', () => ({
  DigitalOceanStorageService: class {
    async uploadFile() { return 'http://mock-url.pdf'; }
    async getSignedUrl() { return 'http://mock-url.pdf'; }
    async deleteFile() { return; }
  }
}));

vi.mock('@/domains/billing/payment/stripe-payment.provider', () => ({
  StripePaymentProvider: class {
    async createCheckoutSession() { return { id: 'mock-session', url: 'http://mock-checkout.com' }; }
    async handleWebhook() { return { status: 'completed' }; }
  }
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

delete process.env.DO_SPACES_KEY; // Force mock storage
delete process.env.DO_SPACES_SECRET;
delete process.env.STRIPE_SECRET_KEY;
delete process.env.STRIPE_WEBHOOK_SECRET;

// Export constant instances initialized once
export const pool = new Pool({ 
  connectionString: TEST_DB_URL,
  ssl: TEST_DB_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false
});
export const db = drizzle(pool);

beforeAll(async () => {
  // Connection is already established via pool and db constants
  // Migrations are handled by global-setup.ts to avoid deadlocks
});

afterAll(async () => {
  if (pool) {
    await pool.end();
  }
});

export { TEST_DB_URL };
