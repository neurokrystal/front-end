import { pool } from '../src/infrastructure/database/connection';

async function run() {
  const reportTypes = [
    'professional_self',
    'under_pressure',
    'relationship_patterns',
    'career_alignment',
    'parenting_patterns',
    'wellbeing'
  ];

  const client = await pool.connect();
  try {
    console.log('Seeding secondary report templates...');
    for (const type of reportTypes) {
      const name = type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      
      await client.query(`
        INSERT INTO report_templates (
          id, name, report_type, template_json, is_active, version, is_default
        ) VALUES (
          $1, $2, $1, '{}'::jsonb, true, 1, true
        ) ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          report_type = EXCLUDED.report_type,
          is_active = true,
          updated_at = NOW()
      `, [type, name]);
    }
    console.log('✅ Secondary report templates seeded');
  } catch (e) {
    console.error('❌ Seeding failed:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
