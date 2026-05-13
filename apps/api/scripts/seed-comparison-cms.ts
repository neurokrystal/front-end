import { pool } from '../src/infrastructure/database/connection';

async function run() {
  const domains = ['safety', 'challenge', 'play'];
  const bands = ['very_low', 'low', 'balanced', 'high', 'excessive'];
  
  const reportTypes = ['relational_compass', 'collaboration_compass', 'family_compass'];
  const sections = ['comparison_aligned', 'comparison_divergent', 'comparison_navigation', 'comparison_strengths'];

  const client = await pool.connect();
  try {
    console.log('Seeding comparison report CMS blocks...');
    let count = 0;

    for (const reportType of reportTypes) {
      for (const section of sections) {
        for (const domain of domains) {
          for (const bandA of bands) {
            for (const bandB of bands) {
              // Only seed relevant sections based on alignment
              const isAligned = bandA === bandB;
              if (section === 'comparison_aligned' && !isAligned) continue;
              if (section === 'comparison_divergent' && isAligned) continue;

              const contentText = `[Comparison: ${reportType}] User A has ${bandA} ${domain}, User B has ${bandB} ${domain}. This interaction leads to ${isAligned ? 'alignment' : 'divergence'} which affects the relationship by... To navigate this, try...`;
              
              await client.query(`
                INSERT INTO report_content_blocks (
                  id, report_type, section_key, domain, score_band, secondary_score_band, content_text, locale, is_active, display_order
                ) VALUES (
                  gen_random_uuid(), $1, $2, $3, $4, $5, $6, 'en', true, 10
                ) ON CONFLICT DO NOTHING
              `, [reportType, section, domain, bandA, bandB, contentText]);
              count++;
            }
          }
        }
      }
    }
    console.log(`✅ Seeded ${count} comparison CMS blocks`);
  } catch (e) {
    console.error('❌ Seeding failed:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
