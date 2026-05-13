import pg from 'pg';
const { Pool } = pg;

async function check() {
  const TEST_DB_URL = 'postgresql://dimensional:dimensional_dev@127.0.0.1:5432/dimensional_test';
  const pool = new Pool({ connectionString: TEST_DB_URL });
  try {
    const res = await pool.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'");
    console.log('Tables:', res.rows.map(r => r.tablename));
    
    const res2 = await pool.query("SELECT * FROM \"drizzle\".\"__drizzle_migrations\"");
    console.log('Migrations:', res2.rows);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

check();
