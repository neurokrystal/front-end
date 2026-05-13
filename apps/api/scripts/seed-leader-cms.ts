import { pool } from '../src/infrastructure/database/connection';

async function run() {
  const domains = ['safety', 'challenge', 'play'];
  const bands = ['very_low', 'low', 'balanced', 'high', 'excessive'];
  
  const sections = [
    'leader_foundation_overview', 'leader_foundation_domain', 'leader_foundation_alignment',
    'leader_manifestation_work', 'leader_manifestation_domain', 'leader_manifestation_patterns',
    'leader_coaching_overview', 'leader_coaching_domain', 'leader_coaching_actions'
  ];

  const client = await pool.connect();
  try {
    console.log('Seeding leader-adapted report CMS blocks...');
    let count = 0;

    for (const section of sections) {
      for (const domain of domains) {
        for (const band of bands) {
          const contentText = `[Leader View] This person has ${band.replace('_', ' ')} ${domain}. In a professional context, this manifests as... To support them, you should...`;
          
          await client.query(`
            INSERT INTO report_content_blocks (
              id, report_type, section_key, domain, score_band, content_text, locale, is_active, display_order
            ) VALUES (
              gen_random_uuid(), 'leader_adapted', $1, $2, $3, $4, 'en', true, 10
            ) ON CONFLICT DO NOTHING
          `, [section, domain, band, contentText]);
          count++;
        }
      }
    }
    console.log(`✅ Seeded ${count} leader-adapted CMS blocks`);
  } catch (e) {
    console.error('❌ Seeding failed:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
