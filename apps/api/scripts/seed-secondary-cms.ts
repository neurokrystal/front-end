import { pool } from '../src/infrastructure/database/connection';

async function run() {
  const domains = ['safety', 'challenge', 'play'];
  const bands = ['very_low', 'low', 'balanced', 'high', 'excessive'];
  
  const reportConfigs = [
    {
      type: 'professional_self',
      sections: ['professional_overview', 'work_strengths', 'work_vulnerabilities', 'professional_alignment']
    },
    {
      type: 'under_pressure',
      sections: ['pressure_overview', 'coping_patterns', 'stress_response', 'resilience_profile']
    },
    {
      type: 'relationship_patterns',
      sections: ['relational_overview', 'attachment_style', 'conflict_patterns', 'intimacy_profile']
    },
    {
      type: 'career_alignment',
      sections: ['career_overview', 'role_fit', 'growth_edges', 'career_risks']
    },
    {
      type: 'parenting_patterns',
      sections: ['parenting_overview', 'parenting_strengths', 'parenting_blindspots', 'child_impact']
    },
    {
      type: 'wellbeing',
      sections: ['wellbeing_overview', 'energy_patterns', 'recovery_profile', 'sustainability']
    }
  ];

  const client = await pool.connect();
  try {
    console.log('Seeding secondary report CMS blocks...');
    let count = 0;

    for (const config of reportConfigs) {
      for (const section of config.sections) {
        for (const domain of domains) {
          for (const band of bands) {
            const contentText = `This is placeholder content for ${config.type} report, section ${section}, domain ${domain}, and band ${band}. It describes how this architectural pattern manifests in this specific context.`;
            
            await client.query(`
              INSERT INTO report_content_blocks (
                id, report_type, section_key, domain, score_band, content_text, locale, is_active, display_order
              ) VALUES (
                gen_random_uuid(), $1, $2, $3, $4, $5, 'en', true, 10
              ) ON CONFLICT DO NOTHING
            `, [config.type, section, domain, band, contentText]);
            count++;
          }
        }
      }
    }
    console.log(`✅ Seeded ${count} CMS blocks`);
  } catch (e) {
    console.error('❌ Seeding failed:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
