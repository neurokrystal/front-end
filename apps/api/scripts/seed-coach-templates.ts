import { pool } from '../src/infrastructure/database/connection';

async function run() {
  const templates = [
    { id: 'client_formulation', name: 'Client Formulation' },
    { id: 'progress', name: 'Progress Report' }
  ];

  const client = await pool.connect();
  try {
    console.log('Seeding coach report templates...');
    for (const t of templates) {
      await client.query(`
        INSERT INTO report_templates (
          id, name, report_type, template_json, is_active, version, is_default
        ) VALUES (
          $1, $2, $1, '{}'::jsonb, true, 1, true
        ) ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          updated_at = NOW()
      `, [t.id, t.name]);
    }
    console.log('✅ Coach report templates seeded');
  } catch (e) {
    console.error('❌ Seeding failed:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
