import { pool } from '../src/infrastructure/database/connection';

async function run() {
  const domains = ['safety', 'challenge', 'play'];
  const bands = ['very_low', 'low', 'balanced', 'high', 'excessive'];
  
  const sections = [
    'clinical_formulation', 'coaching_angles', 'watch_outs', 'therapeutic_focus'
  ];

  const client = await pool.connect();
  try {
    console.log('Seeding coach report CMS blocks...');
    let count = 0;

    for (const section of sections) {
      for (const domain of domains) {
        for (const band of bands) {
          const contentText = `[Coach View] Clinical formulation for ${band} ${domain}: This pattern typically indicates... When coaching, focus on... Potential resistance points include...`;
          
          await client.query(`
            INSERT INTO report_content_blocks (
              id, report_type, section_key, domain, score_band, content_text, locale, is_active, display_order
            ) VALUES (
              gen_random_uuid(), 'client_formulation', $1, $2, $3, $4, 'en', true, 10
            ) ON CONFLICT DO NOTHING
          `, [section, domain, band, contentText]);
          count++;
        }
      }
    }

    // Progress report
    await client.query(`
      INSERT INTO report_content_blocks (
        id, report_type, section_key, content_text, locale, is_active, display_order
      ) VALUES (
        gen_random_uuid(), 'progress', 'progress_interpretation', 'This report shows the movement of domain scores over time. Upward trends in Safety may indicate improved regulation...', 'en', true, 1
      ) ON CONFLICT DO NOTHING
    `);

    console.log(`✅ Seeded ${count + 1} coach CMS blocks`);
  } catch (e) {
    console.error('❌ Seeding failed:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
