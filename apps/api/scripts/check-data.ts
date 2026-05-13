import { pool } from '../src/infrastructure/database/connection';

async function run() {
  const client = await pool.connect();
  try {
    const consentCount = await client.query('SELECT COUNT(*) FROM consent_records_deprecated');
    const grantCount = await client.query('SELECT COUNT(*) FROM share_grants');
    console.log('Consent records (deprecated) count:', consentCount.rows[0].count);
    console.log('Share grants count:', grantCount.rows[0].count);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
