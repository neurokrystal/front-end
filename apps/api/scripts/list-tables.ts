import { pool } from '../src/infrastructure/database/connection';

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables:', res.rows.map(r => r.table_name));
  } finally {
    client.release();
    await pool.end();
  }
}

run();
